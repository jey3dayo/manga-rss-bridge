import { z } from 'zod';

export const mangaOnePageMetadataSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  canonical: z.string().optional(),
  image: z.string().optional(),
  titleId: z.number().optional(),
});

export type MangaOnePageMetadata = z.infer<typeof mangaOnePageMetadataSchema>;
