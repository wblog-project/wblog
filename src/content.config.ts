import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(), date: z.coerce.date(), description: z.string(), tags: z.array(z.string()).default([]),
    cover: z.string().optional(), draft: z.boolean().default(false), updated: z.coerce.date().optional(),
  }),
});
const life = defineCollection({
  loader: glob({ base: './src/content/life', pattern: '**/*.md' }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), summary: z.string(), images: z.array(z.string()).default([]) }),
});
const gallery = defineCollection({
  loader: glob({ base: './src/content/gallery', pattern: '**/*.md' }),
  schema: z.object({ title: z.string(), date: z.coerce.date(), description: z.string(), cover: z.string(), images: z.array(z.string()).default([]) }),
});
export const collections = { posts, life, gallery };
