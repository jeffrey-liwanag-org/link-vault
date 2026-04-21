/**
 * Bulk import bookmarks from a browser HTML export (Netscape Bookmark Format).
 * Works with Brave, Chrome, Edge, Firefox, Safari exports.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run import-browser ~/Downloads/bookmarks.html
 *   ANTHROPIC_API_KEY=sk-ant-... npm run import-browser ~/Downloads/bookmarks.html --no-screenshot
 */

import { JSDOM } from 'jsdom';
import fs from 'fs/promises';
import path from 'path';
import slugify from 'slugify';
import {
  ROOT, BOOKMARKS_DIR, SCREENSHOTS_DIR,
  fetchPage, extractContent, takeScreenshot,
  generateAIMetadata, makeSlug, writeMarkdown,
} from './ingest.js';

const NO_SCREENSHOT = process.argv.includes('--no-screenshot');
const HTML_FILE = process.argv.find(a => a.endsWith('.html'));

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

function parseBookmarkHtml(html: string): Array<{ url: string; title: string }> {
  const dom = new JSDOM(html);
  const links = dom.window.document.querySelectorAll('a[href]');
  const results: Array<{ url: string; title: string }> = [];

  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    if (!href.startsWith('http://') && !href.startsWith('https://')) continue;
    results.push({
      url: href,
      title: a.textContent?.trim() || new URL(href).hostname,
    });
  }
  return results;
}

async function ingestOne(url: string, bookmarkTitle: string, index: number, total: number) {
  console.log(`\n[${index}/${total}] ${url}`);

  let html: string;
  try {
    console.log('  → Fetching...');
    html = await fetchPage(url);
  } catch (err) {
    console.warn(`  ✗ Skipped (fetch failed): ${(err as Error).message}`);
    return;
  }

  const { title, text } = await extractContent(html, url);
  const resolvedTitle = title || bookmarkTitle;
  console.log(`  → Title: ${resolvedTitle}`);

  let screenshotPath: string | undefined;
  if (!NO_SCREENSHOT) {
    try {
      console.log('  → Screenshot...');
      await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
      const tmpSlug = slugify(resolvedTitle, { lower: true, strict: true }).slice(0, 60);
      screenshotPath = path.join(SCREENSHOTS_DIR, `${tmpSlug}-tmp.png`);
      await takeScreenshot(url, screenshotPath);
    } catch (err) {
      console.warn(`  ⚠ Screenshot failed (continuing): ${(err as Error).message}`);
      screenshotPath = undefined;
    }
  }

  let summary: string;
  let tags: string[];
  try {
    console.log('  → AI tagging...');
    ({ summary, tags } = await generateAIMetadata(resolvedTitle, text, url));
    console.log(`  → Tags: ${tags.join(', ')}`);
  } catch (err) {
    console.warn(`  ⚠ AI failed (using fallback): ${(err as Error).message}`);
    summary = `Bookmark saved from ${new URL(url).hostname}.`;
    tags = ['untagged'];
  }

  const slug = await makeSlug(resolvedTitle);

  if (screenshotPath) {
    const finalPath = path.join(SCREENSHOTS_DIR, `${slug}.png`);
    await fs.rename(screenshotPath, finalPath);
    screenshotPath = finalPath;
  }

  await writeMarkdown(slug, {
    url,
    title: resolvedTitle,
    description: summary,
    tags,
    screenshotPath,
    source: 'manual',
  });

  console.log(`  ✓ Saved: src/content/bookmarks/${slug}.md`);
}

async function main() {
  if (!HTML_FILE) {
    console.error('Usage: npm run import-browser <path/to/bookmarks.html> [--no-screenshot]');
    process.exit(1);
  }

  const raw = await fs.readFile(HTML_FILE, 'utf-8');
  const bookmarks = parseBookmarkHtml(raw);
  console.log(`Found ${bookmarks.length} bookmarks in export.`);

  const existing = await getExistingUrls();
  const toIngest = bookmarks.filter(b => !existing.has(b.url));
  const skipped = bookmarks.length - toIngest.length;

  if (skipped > 0) console.log(`Skipping ${skipped} already-imported URL(s).`);
  console.log(`Ingesting ${toIngest.length} new bookmark(s)...`);
  if (NO_SCREENSHOT) console.log('Screenshots disabled.');

  let done = 0;
  let failed = 0;

  for (let i = 0; i < toIngest.length; i++) {
    const { url, title } = toIngest[i];
    try {
      await ingestOne(url, title, i + 1, toIngest.length);
      done++;
    } catch (err) {
      console.error(`  ✗ Failed: ${(err as Error).message}`);
      failed++;
    }
    // Small delay to avoid hammering servers
    if (i < toIngest.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✓ Done: ${done} imported, ${failed} failed, ${skipped} skipped (already existed)`);
  console.log(`\nNext: git add . && git commit -m "import: browser bookmarks" && git push`);
}

main().catch(err => { console.error(err); process.exit(1); });
