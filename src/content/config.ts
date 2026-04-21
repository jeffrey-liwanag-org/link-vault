import { defineCollection, z } from 'astro:content';

const bookmarks = defineCollection({
  type: 'content',
  schema: z.object({
    url: z.string().url(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    screenshot: z.string().optional(),
    savedAt: z.coerce.date(),
    source: z.enum(['bookmarklet', 'manual']).default('bookmarklet'),
    note: z.string().optional(),
  }),
});

export const collections = { bookmarks };
