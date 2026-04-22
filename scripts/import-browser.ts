/**
 * Bulk import bookmarks from a browser HTML export (Netscape Bookmark Format).
 * Works with Brave, Chrome, Edge, Firefox, Safari exports.
 *
 * Usage:
 *   npm run import-browser <bookmarks.html> [options]
 *
 * Options:
 *   --exclude <folder>   Exclude bookmarks whose folder path contains this segment (repeatable)
 *   --metadata-only      Skip fetch, screenshot, and Claude — write title/url/tags only
 *   --dry-run            Print what would be imported, write nothing
 *   --no-screenshot      Skip screenshots (enriched mode only)
 */

import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import {
  BOOKMARKS_DIR, SCREENSHOTS_DIR,
  fetchPage, extractContent, takeScreenshot,
  generateAIMetadata, makeSlug, writeMarkdown,
} from './ingest.js';

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const HTML_FILE = args.find(a => !a.startsWith('--') && a.endsWith('.html'));
const NO_SCREENSHOT = args.includes('--no-screenshot');
const METADATA_ONLY = args.includes('--metadata-only');
const DRY_RUN = args.includes('--dry-run');

// --exclude accepts repeated flags or comma-separated keyword substrings
// e.g. --exclude "Imported from Google" --exclude Personal
const EXCLUDE_KEYWORDS: string[] = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--exclude' && args[i + 1]) {
    EXCLUDE_KEYWORDS.push(args[++i]);
  }
}

// Netscape folder wrapper names that carry no semantic meaning as tags
const WRAPPER_FOLDERS = new Set([
  'Bookmarks', 'Bookmarks Bar', 'Other Bookmarks', 'Favorites',
  'Imported from Google Chrome Jeffrey.', 'Imported from Google Chrome',
  'Imported from Safari', 'Mobile Bookmarks',
]);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ParsedBookmark {
  url: string;
  title: string;
  folderPath: string[];
  addedAt: Date | null;
}

// ── Parser ────────────────────────────────────────────────────────────────────
// Uses regex state machine instead of JSDOM — HTML5 parser destroys Netscape
// bookmark structure by rejecting <DL> inside <DT>.

function parseBookmarkHtml(html: string): ParsedBookmark[] {
  const results: ParsedBookmark[] = [];
  const stack: string[] = [];

  // Tokenise only the tags we care about
  const tagRe = /<(\/?)([A-Za-z0-9]+)([^>]*)>/g;
  let currentH3 = '';
  let inH3 = false;

  // We need text content between tags for H3 and A
  const fullRe = /<(\/?)([A-Za-z0-9]+)([^>]*)>|([^<]+)/g;

  let match: RegExpExecArray | null;
  let pendingA: { href: string; addedAt: Date | null } | null = null;

  while ((match = fullRe.exec(html)) !== null) {
    const [, slash, tag, attrs, text] = match;

    if (text !== undefined) {
      if (inH3) currentH3 += text;
      if (pendingA) pendingA = { ...pendingA }; // accumulate title via separate var below
      continue;
    }

    const tagUp = tag?.toUpperCase();

    if (tagUp === 'H3') {
      if (!slash) { inH3 = true; currentH3 = ''; }
      else { inH3 = false; stack.push(currentH3.trim()); }
    } else if (tagUp === 'DL' && slash) {
      if (stack.length > 0) stack.pop();
    } else if (tagUp === 'A') {
      if (!slash) {
        const hrefM = attrs.match(/href="([^"]+)"/i);
        const dateM = attrs.match(/add_date="([^"]+)"/i);
        const href = hrefM?.[1] ?? '';
        if (href.startsWith('http://') || href.startsWith('https://')) {
          pendingA = {
            href,
            addedAt: dateM ? new Date(parseInt(dateM[1], 10) * 1000) : null,
          };
        }
      } else if (pendingA) {
        // Grab title from between <A>...</A> via a targeted re on the raw segment
        const segStart = match.index - 200 < 0 ? 0 : match.index - 200;
        const seg = html.slice(segStart, match.index);
        const titleM = seg.match(/>([^<]+)$/);
        const rawTitle = titleM?.[1]?.trim() || new URL(pendingA.href).hostname;
        const title = rawTitle
          .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
          .replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)));
        results.push({
          url: pendingA.href,
          title,
          folderPath: [...stack],
          addedAt: pendingA.addedAt,
        });
        pendingA = null;
      }
    }
  }

  return results;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function folderToTags(folderPath: string[]): string[] {
  const tags = folderPath
    .filter(seg => !WRAPPER_FOLDERS.has(seg))
    .map(seg => slugify(seg, { lower: true, strict: true }))
    .filter(Boolean);
  return tags.length > 0 ? tags : ['unsorted'];
}

function isExcluded(folderPath: string[]): boolean {
  const pathStr = folderPath.join(' / ');
  return EXCLUDE_KEYWORDS.some(kw => pathStr.toLowerCase().includes(kw.toLowerCase()));
}

async function getExistingUrls(): Promise<Set<string>> {
  const files = await fs.readdir(BOOKMARKS_DIR).catch(() => []);
  const urls = new Set<string>();
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = await fs.readFile(path.join(BOOKMARKS_DIR, file), 'utf-8');
    const match = content.match(/^url:\s*(.+)$/m);
    if (match) urls.add(match[1].trim());
  }
  return urls;
}

// ── Ingest functions ──────────────────────────────────────────────────────────

async function ingestMetadataOnly(bm: ParsedBookmark, index: number, total: number) {
  console.log(`\n[${index}/${total}] ${bm.url}`);

  const tags = folderToTags(bm.folderPath);
  let hostname: string;
  try {
    hostname = new URL(bm.url).hostname;
  } catch {
    console.warn('  ✗ Invalid URL, skipping');
    return;
  }

  const slug = await makeSlug(bm.title);
  await writeMarkdown(slug, {
    url: bm.url,
    title: bm.title,
    description: `Bookmark from ${hostname}.`,
    tags,
    savedAt: bm.addedAt ?? undefined,
    source: 'browser-import',
  });

  console.log(`  ✓ ${slug}.md  [${tags.join(', ')}]`);
}

async function ingestEnriched(bm: ParsedBookmark, index: number, total: number) {
  console.log(`\n[${index}/${total}] ${bm.url}`);

  let html: string;
  try {
    console.log('  → Fetching...');
    html = await fetchPage(bm.url);
  } catch (err) {
    console.warn(`  ✗ Skipped (fetch failed): ${(err as Error).message}`);
    return;
  }

  const { title, text } = await extractContent(html, bm.url);
  const resolvedTitle = title || bm.title;
  console.log(`  → Title: ${resolvedTitle}`);

  let screenshotPath: string | undefined;
  if (!NO_SCREENSHOT) {
    try {
      console.log('  → Screenshot...');
      await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
      const tmpSlug = slugify(resolvedTitle, { lower: true, strict: true }).slice(0, 60);
      screenshotPath = path.join(SCREENSHOTS_DIR, `${tmpSlug}-tmp.png`);
      await takeScreenshot(bm.url, screenshotPath);
    } catch (err) {
      console.warn(`  ⚠ Screenshot failed (continuing): ${(err as Error).message}`);
      screenshotPath = undefined;
    }
  }

  let summary: string;
  let aiTags: string[];
  try {
    console.log('  → AI tagging...');
    ({ summary, tags: aiTags } = await generateAIMetadata(resolvedTitle, text, bm.url));
    console.log(`  → Tags: ${aiTags.join(', ')}`);
  } catch (err) {
    console.warn(`  ⚠ AI failed (using fallback): ${(err as Error).message}`);
    summary = `Bookmark from ${new URL(bm.url).hostname}.`;
    aiTags = folderToTags(bm.folderPath);
  }

  const slug = await makeSlug(resolvedTitle);

  if (screenshotPath) {
    const finalPath = path.join(SCREENSHOTS_DIR, `${slug}.png`);
    await fs.rename(screenshotPath, finalPath);
    screenshotPath = finalPath;
  }

  await writeMarkdown(slug, {
    url: bm.url,
    title: resolvedTitle,
    description: summary,
    tags: aiTags,
    screenshotPath,
    savedAt: bm.addedAt ?? undefined,
    source: 'browser-import',
  });

  console.log(`  ✓ Saved: src/content/bookmarks/${slug}.md`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!HTML_FILE) {
    console.error('Usage: npm run import-browser <path/to/bookmarks.html> [--exclude <folder>] [--metadata-only] [--dry-run] [--no-screenshot]');
    process.exit(1);
  }

  const raw = await fs.readFile(HTML_FILE, 'utf-8');
  const all = parseBookmarkHtml(raw);
  console.log(`Parsed ${all.length} total bookmarks.`);

  const filtered = all.filter(b => !isExcluded(b.folderPath));
  const excludedCount = all.length - filtered.length;
  if (excludedCount > 0) console.log(`Excluded ${excludedCount} (folder filter).`);

  if (METADATA_ONLY) console.log('Mode: metadata-only (no fetch, no screenshot, no Claude).');
  if (NO_SCREENSHOT && !METADATA_ONLY) console.log('Screenshots disabled.');

  if (DRY_RUN) {
    // Group by top-level folder for summary
    const byFolder: Record<string, number> = {};
    for (const bm of filtered) {
      const top = bm.folderPath.find(s => !WRAPPER_FOLDERS.has(s)) ?? '(root)';
      byFolder[top] = (byFolder[top] ?? 0) + 1;
    }
    console.log('\n── Dry run — would import ───────────────────────────────');
    for (const [folder, count] of Object.entries(byFolder).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${count.toString().padStart(4)}  ${folder}`);
    }
    console.log(`─────────────────────────────────────────────────────────`);
    console.log(`  TOTAL: ${filtered.length} bookmarks`);
    return;
  }

  await fs.mkdir(BOOKMARKS_DIR, { recursive: true });
  const existing = await getExistingUrls();
  const toIngest = filtered.filter(b => !existing.has(b.url));
  const skipped = filtered.length - toIngest.length;

  if (skipped > 0) console.log(`Skipping ${skipped} already-imported URL(s).`);
  console.log(`Ingesting ${toIngest.length} new bookmark(s)...`);

  let done = 0;
  let failed = 0;

  for (let i = 0; i < toIngest.length; i++) {
    const bm = toIngest[i];
    try {
      if (METADATA_ONLY) {
        await ingestMetadataOnly(bm, i + 1, toIngest.length);
      } else {
        await ingestEnriched(bm, i + 1, toIngest.length);
        if (i < toIngest.length - 1) await new Promise(r => setTimeout(r, 1500));
      }
      done++;
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
      failed++;
    }
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✓ Done: ${done} imported, ${failed} failed, ${skipped} skipped (already existed), ${excludedCount} excluded (folder filter)`);
  if (METADATA_ONLY) {
    console.log(`\nNext: git add . && git commit -m "import: browser bookmarks (metadata-only)" && git push`);
  } else {
    console.log(`\nNext: git add . && git commit -m "import: browser bookmarks" && git push`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
