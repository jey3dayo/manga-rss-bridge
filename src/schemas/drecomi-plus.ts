import { z } from 'zod';

const episodeThumbnailSchema = z
  .object({
    cdn_url: z.string().optional(),
  })
  .passthrough();

export const drecomiPlusEpisodeSchema = z
  .object({
    code: z.union([z.string(), z.number()]).nullable().optional(),
    name: z.string().optional(),
    episode_number: z.union([z.number(), z.string()]).optional(),
    publish_at: z.string().optional(),
    sale_start_at: z.string().optional(),
    thumbnail: episodeThumbnailSchema.optional(),
  })
  .passthrough();

export const drecomiPlusSeriesDetailSchema = z
  .object({
    code: z.string().optional(),
    name: z.string().optional(),
    summary: z.string().optional(),
    catch_copy: z.string().optional(),
  })
  .passthrough();

export const drecomiPlusEpisodesDataSchema = z
  .object({
    items: z.array(drecomiPlusEpisodeSchema).optional(),
  })
  .passthrough();

export const drecomiPlusDehydratedQuerySchema = z
  .object({
    queryHash: z.union([z.string(), z.array(z.unknown())]).optional(),
    queryKey: z.array(z.unknown()).optional(),
    state: z
      .object({
        data: z.unknown(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const drecomiPlusDehydratedStateSchema = z
  .object({
    state: z
      .object({
        queries: z.array(drecomiPlusDehydratedQuerySchema).optional(),
        mutations: z.unknown(),
      })
      .passthrough(),
  })
  .passthrough();

export type DrecomiPlusEpisode = z.infer<typeof drecomiPlusEpisodeSchema>;
export type DrecomiPlusSeriesDetail = z.infer<typeof drecomiPlusSeriesDetailSchema>;
export type DrecomiPlusDehydratedState = z.infer<typeof drecomiPlusDehydratedStateSchema>;
