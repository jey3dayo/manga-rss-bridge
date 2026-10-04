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

export const ganganNextDataSchema = z
  .object({
    buildId: z.string().optional(),
    props: z.unknown().optional(),
  })
  .passthrough();

export const ganganTitleDataSchema = z.object({
  pageProps: z.object({
    data: z.object({
      default: ganganTitleSchema,
    }),
  }),
});

export const ganganEmbeddedTitleSchema = z.object({
  props: ganganTitleDataSchema,
});

export type GanganNextData = z.infer<typeof ganganNextDataSchema>;
