import { z } from 'zod';

export const providerMetadataSchema = z.object({
  id: z.string().min(1),
  siteName: z.string().min(1),
  baseUrl: z.url(),
});

export type ProviderMetadata = z.infer<typeof providerMetadataSchema>;
