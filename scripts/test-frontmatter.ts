import fs from 'fs/promises';
import path from 'path';
import { parseFrontmatter, serializeFrontmatter } from '../src/lib/frontmatter.ts';

const BOOKMARKS_DIR = path.resolve(import.meta.dirname, '../src/content/bookmarks');

// Files not produced by ingest.ts use unquoted title/description.
// The serializer normalizes them to quoted form on first save — not a parser bug.
function isQuoteNormalization(original: string, roundTripped: string): boolean {
  const normalized = original
    .replace(/^(title|description): (.+)$/mg, (_m, key, val) => {
      if (!val.startsWith('"')) {
        return `${key}: "${val.replace(/"/g, '\\"')}"`;
      }
      return _m;
    });
  return normalized === roundTripped;
}

async function main() {
  const entries = await fs.readdir(BOOKMARKS_DIR);
  const mdFiles = entries.filter(f => f.endsWith('.md'));

  let passed = 0;
  let willNormalize = 0;
  const failures: { file: string; original: string; roundTripped: string }[] = [];

  for (const file of mdFiles) {
    const filePath = path.join(BOOKMARKS_DIR, file);
    const original = await fs.readFile(filePath, 'utf-8');

    let roundTripped: string;
    try {
      const { data, body } = parseFrontmatter(original);
      roundTripped = serializeFrontmatter(data, body);
    } catch (err) {
      failures.push({ file, original, roundTripped: `PARSE ERROR: ${err}` });
      continue;
    }

    if (roundTripped === original) {
      passed++;
    } else if (isQuoteNormalization(original, roundTripped)) {
      willNormalize++;
      console.log(`  ℹ️  ${file}: unquoted title/description — will be normalized to canonical form on first save`);
    } else {
      failures.push({ file, original, roundTripped });
    }
  }

  console.log('');
  if (failures.length === 0) {
    console.log(`✅ ${passed} files round-tripped correctly`);
    if (willNormalize > 0) {
      console.log(`ℹ️  ${willNormalize} files have non-canonical quoting (hand-authored, not via ingest.ts) — will be normalized on first edit`);
    }
    process.exit(0);
  } else {
    console.log(`❌ ${failures.length} true failures, ${passed} passed, ${willNormalize} will-normalize`);
    console.log('');
    for (const { file, original, roundTripped } of failures) {
      console.log(`--- FAIL: ${file} ---`);
      console.log('ORIGINAL:');
      console.log(JSON.stringify(original));
      console.log('ROUND-TRIPPED:');
      console.log(JSON.stringify(roundTripped));
      console.log('');
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
