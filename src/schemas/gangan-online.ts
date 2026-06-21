import { z } from 'zod';

const chapterSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  mainText: z.string().optional(),
});

export const ganganTitleSchema = z.object({
  titleName: z.string().optional(),
  author: z.string().optional(),
  description: z.string().optional(),
  chapters: z.array(chapterSchema).optional(),
});

export type GanganTitle = z.infer<typeof ganganTitleSchema>;
