import { z } from 'zod';

export const kadocomiEpisodeSchema = z.object({
  code: z.string().optional(),
  title: z.string().optional(),
  subTitle: z.string().optional(),
  thumbnail: z.string().optional(),
  updateDate: z.string().optional(),
  isActive: z.boolean().optional(),
  internal: z
    .object({
      episodeNo: z.number().optional(),
    })
    .optional(),
});

export const kadocomiWorkResponseSchema = z.object({
  work: z
    .object({
      title: z.string().optional(),
      catchphrase: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
  firstEpisodes: z
    .object({
      result: z.array(kadocomiEpisodeSchema).optional(),
    })
    .optional(),
});

export type KadocomiWorkResponse = z.infer<typeof kadocomiWorkResponseSchema>;
