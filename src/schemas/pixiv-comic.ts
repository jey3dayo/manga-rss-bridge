import { z } from 'zod';

const episodeIdSchema = z.union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]);

const pixivEpisodeSchema = z.object({
  id: episodeIdSchema,
  numbering_title: z.string().optional(),
  sub_title: z.string().optional(),
  read_start_at: z.number().int().positive().nullable().optional(),
  viewer_path: z.string().optional(),
});

export const pixivComicWorkResponseSchema = z.object({
  data: z.object({
    official_work: z.object({
      id: z.union([z.number().int().positive(), z.string().regex(/^[1-9]\d*$/)]),
      name: z.string().min(1),
      author: z.string().optional(),
    }),
  }),
});

export const pixivComicEpisodesResponseSchema = z.object({
  data: z.object({
    episodes: z.array(
      z.object({
        state: z.string(),
        episode: pixivEpisodeSchema.nullish(),
        message: z.string().optional(),
      }),
    ),
  }),
});

export type PixivComicWorkResponse = z.infer<typeof pixivComicWorkResponseSchema>;
export type PixivComicEpisodesResponse = z.infer<typeof pixivComicEpisodesResponseSchema>;
