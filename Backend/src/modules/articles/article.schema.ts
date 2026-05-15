import { z } from 'zod';

export const getArticlesSchema = z.object({
  query: z.object({
    page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
    limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
    search: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    sentiment: z.enum(['Positive', 'Negative', 'Neutral']).optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    date_from: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    date_to: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    sort_by: z.string().optional().default('published_at'),
  }),
});

export const getArticleByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid article ID'),
  }),
});
