/**
 * Re-enriches browser-import bookmarks that have generic descriptions.
 * Fetches each URL, extracts real content, generates AI summary + tags,
 * and overwrites the existing markdown file (same slug, original savedAt).
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... npm run enrich
 *
 * Options:
 *   --dry-run   List which files would be enriched, don't fetch or write
 *   --limit N   Only process first N bookmarks (for testing)
 */

import fs from 'fs/promises';
import path from 'path';
import {
  BOOKMARKS_DIR,
  fetchPage, extractContent, generateAIMetadata,
} from './ingest.js';

const DRY_RUN = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;

// URLs we know won't fetch without auth — skip immediately
const SKIP_PATTERNS = [
  /x\.com/,
  /twitter\.com/,
  /discord\.com/,
  /wilmarint\.sharepoint\.com/,
  /testwilmar-intl\.com/,
  /wilmar-international$/,
  /file:\/\//,
  /drive\.google\.com/,
];

interface Bookmark {
  filePath: string;
  slug: string;
  url: string;
  title: string;
  tags: string[];
  savedAt: string;
  source: string;
}

async function parseMd(filePath: string): Promise<Bookmark | null> {
  const content = await fs.readFile(filePath, 'utf-8');
  const urlM = content.match(/^url:\s*(.+)$/m);
  const titleM = content.match(/^title:\s*"?(.+?)"?$/m);
  const tagsM = content.match(/^tags:\s*\[(.+)\]$/m);
  const savedAtM = content.match(/^savedAt:\s*(.+)$/m);
  const sourceM = content.match(/^source:\s*(.+)$/m);

  if (!urlM || !sourceM) return null;
  if (sourceM[1].trim() !== 'browser-import') return null;

  return {
    filePath,
    slug: path.basename(filePath, '.md'),
    url: urlM[1].trim(),
    title: titleM?.[1]?.trim() ?? '',
    tags: tagsM ? tagsM[1].split(',').map(t => t.trim()) : [],
    savedAt: savedAtM?.[1]?.trim() ?? new Date().toISOString().split('T')[0],
    source: 'browser-import',
  };
}

function shouldSkip(url: string): boolean {
  return SKIP_PATTERNS.some(re => re.test(url));
}

async function enrichOne(bm: Bookmark, index: number, total: number): Promise<boolean> {
  console.log(`\n[${index}/${total}] ${bm.url}`);

  if (shouldSkip(bm.url)) {
    console.log('  → Skipped (requires auth or internal)');
    return false;
  }

  let html: string;
  try {
    html = await fetchPage(bm.url);
  } catch (err) {
    console.warn(`  ✗ Fetch failed: ${(err as Error).message}`);
    return false;
  }

  const { title, text, coverImage } = await extractContent(html, bm.url);
  const resolvedTitle = title || bm.title;
  console.log(`  → Title: ${resolvedTitle}`);

  let summary: string;
  let aiTags: string[];
  try {
    ({ summary, tags: aiTags } = await generateAIMetadata(resolvedTitle, text, bm.url));
    console.log(`  → Tags: ${aiTags.join(', ')}`);
  } catch (err) {
    console.warn(`  ⚠ AI failed: ${(err as Error).message}`);
    return false;
  }

  // Merge folder-derived tags with AI tags, dedupe
  const mergedTags = [...new Set([...bm.tags, ...aiTags])];

  // Overwrite existing file with same slug and original savedAt
  const frontmatter = [
    '---',
    `url: ${bm.url}`,
    `title: "${resolvedTitle.replace(/"/g, '\\"')}"`,
    `description: "${summary.replace(/"/g, '\\"')}"`,
    `tags: [${mergedTags.join(', ')}]`,
    coverImage ? `coverImage: ${coverImage}` : null,
    `savedAt: ${bm.savedAt}`,
    `source: browser-import`,
    '---',
  ].filter(Boolean).join('\n');

  await fs.writeFile(bm.filePath, frontmatter + '\n');
  console.log(`  ✓ Updated`);
  return true;
}

async function main() {
  const files = (await fs.readdir(BOOKMARKS_DIR))
    .filter(f => f.endsWith('.md'))
    .map(f => path.join(BOOKMARKS_DIR, f));

  const bookmarks: Bookmark[] = [];
  for (const f of files) {
    const bm = await parseMd(f);
    if (bm) bookmarks.push(bm);
  }

  console.log(`Found ${bookmarks.length} browser-import bookmark(s).`);

  const toProcess = bookmarks.slice(0, LIMIT);

  if (DRY_RUN) {
    console.log('\n── Dry run ───────────────────────────────────────────');
    for (const bm of toProcess) {
      const skip = shouldSkip(bm.url) ? ' [skip — auth/internal]' : '';
      console.log(`  ${bm.slug}${skip}`);
    }
    return;
  }

  let done = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const bm = toProcess[i];
    try {
      const enriched = await enrichOne(bm, i + 1, toProcess.length);
      if (enriched) done++;
      else skipped++;
    } catch (err) {
      console.error(`  ✗ ${(err as Error).message}`);
      failed++;
    }
    // Rate-limit: 1.5s between requests to be polite
    if (i < toProcess.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n─────────────────────────────`);
  console.log(`✓ Done: ${done} enriched, ${skipped} skipped, ${failed} failed`);
  console.log(`\nNext: git add . && git commit -m "enrich: browser-import bookmarks" && git push`);
}

main().catch(err => { console.error(err); process.exit(1); });
