import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ base: process.env.ASTRO_BLOG_POSTS_DIR || '../_posts', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date().optional(),
    pubDate: z.coerce.date().optional(),
    last_modified_at: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    published: z.boolean().default(true),
    tags: z.array(z.string()).default([]),
    category: z.string().optional(),
    lang: z.string().default('en'),
    heroImage: z.string().optional(),
    series: z.object({ name: z.string().min(1), part: z.number().int().positive() }).optional()
  }).passthrough()
});

export const collections = { blog };
