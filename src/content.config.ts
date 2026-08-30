import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ base: './site/content/posts', pattern: '**/*.md' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    description: z.string().min(1),
    tags: z.array(z.string()).default([]),
    cover: image().optional(),
    coverAlt: z.string().default(''),
    draft: z.boolean().default(false),
    updated: z.coerce.date().optional(),
  }),
});

const life = defineCollection({
  loader: glob({ base: './site/content/life', pattern: '**/*.md' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    images: z.array(z.object({ src: image(), alt: z.string().min(1) })).min(1),
  }),
});

const gallery = defineCollection({
  loader: glob({ base: './site/content/gallery', pattern: '**/*.md' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    description: z.string().min(1),
    images: z.array(z.object({ src: image(), alt: z.string().min(1) })).min(1),
  }),
});

const pages = defineCollection({
  loader: glob({ base: './site/content/pages', pattern: '**/*.md' }),
  schema: ({ image }) => z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    portrait: image().optional(),
    portraitAlt: z.string().default(''),
  }),
});

export const collections = { posts, life, gallery, pages };
