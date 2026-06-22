import { describe, expect, it } from 'vitest';
import { PROVIDERS } from '../constants/providers.ts';
import { providerMetadataSchema } from '../schemas/provider.ts';

describe('provider metadata schema', () => {
  it('validates all configured providers', () => {
    for (const provider of Object.values(PROVIDERS)) {
      expect(providerMetadataSchema.safeParse(provider).success).toBe(true);
    }
  });

  it('rejects invalid provider metadata', () => {
    expect(
      providerMetadataSchema.safeParse({
        id: '',
        siteName: 'Site',
        baseUrl: 'https://example.com',
      }).success,
    ).toBe(false);
    expect(
      providerMetadataSchema.safeParse({
        id: 'site',
        siteName: '',
        baseUrl: 'https://example.com',
      }).success,
    ).toBe(false);
    expect(
      providerMetadataSchema.safeParse({
        id: 'site',
        siteName: 'Site',
        baseUrl: 'not-a-url',
      }).success,
    ).toBe(false);
  });
});
