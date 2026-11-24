import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firecrossFixture } from '../fixtures/providers/firecross.ts';
import { failedFeed, mockResponses } from '../fixtures/providers/test-helpers.ts';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>(async () => {
      throw new Error('Network disabled: install an explicit response fixture');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('firecross pagination branches', () => {
  const page1Url = 'https://firecross.jp/ebook/series/42?sort=latest&page=1';
  const page1 = firecrossFixture.responses[page1Url] as string;

  it('fails when a later page cannot be fetched', async () => {
    mockResponses({ [page1Url]: page1 });
    await expect(failedFeed('firecross', '42')).resolves.toBeInstanceOf(Error);
  });

  it('fails when a later page lists no episodes', async () => {
    mockResponses({
      [page1Url]: page1,
      'https://firecross.jp/ebook/series/42?sort=latest&page=2': '<html></html>',
    });
    await expect(failedFeed('firecross', '42')).resolves.toBeInstanceOf(Error);
  });
});
