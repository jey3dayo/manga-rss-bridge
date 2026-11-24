import { z } from 'zod';

const coronaExIdSchema = z.union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]);

export const coronaExNextDataSchema = z.object({
  props: z.object({
    pageProps: z.object({
      fallbackData: z.object({
        comic: z.object({
          id: coronaExIdSchema,
          title: z.string().min(1),
          description: z.string().optional(),
          latest_episode: z.object({
            id: coronaExIdSchema,
            title: z.string().min(1),
            published_at: z.string().min(1),
          }),
        }),
      }),
    }),
  }),
});

type CoronaExNextData = z.infer<typeof coronaExNextDataSchema>;
export type CoronaExComic = CoronaExNextData['props']['pageProps']['fallbackData']['comic'];
