import { chromium } from 'playwright';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import Anthropic from '@anthropic-ai/sdk';
import sharp from 'sharp';
import slugify from 'slugify';
import fs from 'fs/promises';
import path from 'path';

export const ROOT = path.resolve(import.meta.dirname, '..');
export const BOOKMARKS_DIR = path.join(ROOT, 'src/content/bookmarks');
export const SCREENSHOTS_DIR = path.join(ROOT, 'public/screenshots');

export async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LinkVault/1.0)' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

export async function extractContent(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  const rawOg =
    dom.window.document.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
    dom.window.document.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
    dom.window.document.querySelector('meta[property="og:image:secure_url"]')?.getAttribute('content');

  let coverImage: string | undefined;
  if (rawOg) {
    try { coverImage = new URL(rawOg, url).href; } catch { /* skip invalid */ }
  }

  return {
    title: article?.title ?? new URL(url).hostname,
    text: article?.textContent?.slice(0, 8000) ?? '',
    coverImage,
  };
}

export async function takeScreenshot(url: string, outputPath: string) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    const buffer = await page.screenshot({ type: 'png' });

    await sharp(buffer)
      .resize(1280, 800, { fit: 'inside', withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toFile(outputPath);
  } finally {
    await browser.close();
  }
}

export async function generateAIMetadata(title: string, text: string, url: string) {
  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `You are tagging a web bookmark for a personal AI-related bookmark library.
Given the page title, URL, and content, return ONLY strict JSON with no markdown:
{ "summary": "<2-3 sentences, neutral tone, what the page is about>", "tags": ["<3-5 lowercase kebab-case tags>"] }

Title: ${title}
URL: ${url}
Content:
${text}`,
    }],
  });

  const raw = (message.content[0] as { text: string }).text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(raw) as { summary: string; tags: string[] };
}

export async function makeSlug(title: string): Promise<string> {
  const base = slugify(title, { lower: true, strict: true }).slice(0, 60);
  let slug = base;
  let n = 2;
  while (await fs.access(path.join(BOOKMARKS_DIR, `${slug}.md`)).then(() => true).catch(() => false)) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function writeMarkdown(slug: string, data: {
  url: string; title: string; description: string;
  tags: string[]; screenshotPath?: string; coverImage?: string; source?: string; savedAt?: Date;
}) {
  const date = (data.savedAt ?? new Date()).toISOString().split('T')[0];
  const screenshot = data.screenshotPath
    ? `/link-vault/screenshots/${path.basename(data.screenshotPath)}`
    : undefined;

  const frontmatter = [
    '---',
    `url: ${data.url}`,
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `description: "${data.description.replace(/"/g, '\\"')}"`,
    `tags: [${data.tags.join(', ')}]`,
    screenshot ? `screenshot: ${screenshot}` : null,
    data.coverImage ? `coverImage: ${data.coverImage}` : null,
    `savedAt: ${date}`,
    `source: ${data.source ?? 'bookmarklet'}`,
    '---',
  ].filter(Boolean).join('\n');

  await fs.writeFile(path.join(BOOKMARKS_DIR, `${slug}.md`), frontmatter + '\n');
}

// ── CLI entry point ──────────────────────────────────────────────────────────

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: npm run ingest <url>');
    process.exit(1);
  }

  console.log(`Ingesting: ${url}`);

  console.log('  → Fetching page...');
  const html = await fetchPage(url);
  const { title, text, coverImage } = await extractContent(html, url);
  console.log(`  → Title: ${title}`);

  console.log('  → Taking screenshot...');
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });
  const tmpSlug = slugify(title, { lower: true, strict: true }).slice(0, 60);
  const tmpScreenshotPath = path.join(SCREENSHOTS_DIR, `${tmpSlug}.png`);
  let capturedScreenshot = true;
  try {
    await takeScreenshot(url, tmpScreenshotPath);
  } catch (err) {
    console.warn(`  ⚠ Screenshot skipped: ${(err as Error).message}`);
    capturedScreenshot = false;
  }

  console.log('  → Generating AI summary + tags...');
  const { summary, tags } = await generateAIMetadata(title, text, url);
  console.log(`  → Tags: ${tags.join(', ')}`);

  const slug = await makeSlug(title);
  let finalScreenshotPath: string | undefined;
  if (capturedScreenshot) {
    finalScreenshotPath = path.join(SCREENSHOTS_DIR, `${slug}.png`);
    if (tmpSlug !== slug) await fs.rename(tmpScreenshotPath, finalScreenshotPath);
    else finalScreenshotPath = tmpScreenshotPath;
  }

  await writeMarkdown(slug, { url, title, description: summary, tags, screenshotPath: finalScreenshotPath, coverImage });
  console.log(`✓ Done — src/content/bookmarks/${slug}.md`);
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error(err); process.exit(1); });
}
