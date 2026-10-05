import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    tag: z.string(),
    excerpt: z.string(),
    /** Language of this file. English is the default and the one the lists show. */
    lang: z.enum(['en', 'es']).default('en'),
    /**
     * Shared key of the same article in every language. Two files, one per
     * language, carry the same value so the article page can offer a switch.
     * An article with a single language leaves it out.
     */
    pair: z.string().optional(),
  }),
});

export const collections = { blog };
