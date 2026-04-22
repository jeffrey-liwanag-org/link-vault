// Pure-JS module: safe to import from both browser and Node contexts.

export interface Frontmatter {
  url: string;
  title: string;
  description: string;
  tags: string[];
  screenshot?: string;
  coverImage?: string;
  savedAt: string;    // YYYY-MM-DD string as stored (not a Date object)
  source: string;
  note?: string;
}

/**
 * Parse a bookmark markdown file into structured frontmatter + body.
 * The body is everything after the closing ---, preserved verbatim.
 */
export function parseFrontmatter(md: string): { data: Frontmatter; body: string } {
  // File starts with "---\n" and has a closing "---\n"
  // Split into at most 3 parts: ['', inner block, body]
  const parts = md.split(/^---$/m);
  // parts[0] = '' (before opening ---), parts[1] = frontmatter block, parts[2]+ = body
  const inner = parts[1] ?? '';
  // Everything after the closing --- (strip the leading newline)
  const rawBody = parts.slice(2).join('---');
  const body = rawBody.startsWith('\n') ? rawBody.slice(1) : rawBody;

  const data: Partial<Frontmatter> = {};

  for (const line of inner.split('\n')) {
    if (!line.trim()) continue;

    const colonIdx = line.indexOf(': ');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 2);

    switch (key) {
      case 'url':
        data.url = value;
        break;
      case 'title':
        data.title = stripQuotes(value);
        break;
      case 'description':
        data.description = stripQuotes(value);
        break;
      case 'tags': {
        const inner = value.slice(1, -1); // strip [ and ]
        // Tags are kebab-case slugs (a-z, 0-9, hyphens) — ", " can never appear within a tag.
        data.tags = inner.split(', ').filter(t => t.length > 0);
        break;
      }
      case 'screenshot':
        data.screenshot = value;
        break;
      case 'coverImage':
        data.coverImage = value;
        break;
      case 'savedAt':
        data.savedAt = value;
        break;
      case 'source':
        data.source = value;
        break;
      case 'note':
        data.note = stripQuotes(value);
        break;
    }
  }

  return {
    data: data as Frontmatter,
    body,
  };
}

/**
 * Serialize frontmatter + body back to a markdown string, using the same
 * format as scripts/ingest.ts so git diffs are clean.
 */
export function serializeFrontmatter(data: Frontmatter, body: string): string {
  const lines = [
    '---',
    `url: ${data.url}`,
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `description: "${data.description.replace(/"/g, '\\"')}"`,
    `tags: [${data.tags.join(', ')}]`,
    data.screenshot ? `screenshot: ${data.screenshot}` : null,
    data.coverImage ? `coverImage: ${data.coverImage}` : null,
    `savedAt: ${data.savedAt}`,
    `source: ${data.source}`,
    data.note ? `note: "${data.note.replace(/"/g, '\\"')}"` : null,
    '---',
  ].filter(Boolean).join('\n');

  return lines + '\n' + body;
}

function stripQuotes(value: string): string {
  // Value is: "some text with \" escapes"
  // Strip outer double quotes and unescape \"
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\"/g, '"');
  }
  return value;
}
