import { describe, expect, it } from 'vitest';
import { escapedRssFeedFixture } from '../fixtures/rss.ts';
import { Result } from '../lib/result.ts';
import { createProvider } from './create-provider.ts';

const metadata = { id: 'provider', siteName: 'Site' };

describe('provider result boundary', () => {
  it('returns the feed without changing its metadata or identifier', async () => {
    const provider = createProvider(metadata, async (identifier) =>
      Result.succeed({ ...escapedRssFeedFixture, title: identifier }),
    );

    expect(provider.id).toBe('provider');
    expect(provider.siteName).toBe('Site');
    const result = await provider.fetchFeed('  work/日本語  ');
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) throw result.error;
    expect(result.value).toEqual({ ...escapedRssFeedFixture, title: '  work/日本語  ' });
  });

  it.each(['synchronous', 'asynchronous'])('returns %s errors as failures', async (kind) => {
    const error = new Error('upstream failed');
    const fail = () => {
      throw error;
    };
    const provider = createProvider(metadata, kind === 'synchronous' ? fail : async () => fail());

    const result = await provider.fetchFeed('work');
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) throw new Error('expected failure');
    expect(result.error).toBe(error);
  });

  it('normalizes non-Error failures', async () => {
    const provider = createProvider(metadata, async () => Promise.reject('upstream failed'));

    const result = await provider.fetchFeed('work');
    expect(Result.isFailure(result)).toBe(true);
    if (Result.isSuccess(result)) throw new Error('expected failure');
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('upstream failed');
  });

  it('preserves a returned failure without nesting it inside a success', async () => {
    const failure = Result.fail(new Error('invalid metadata'));
    const provider = createProvider(metadata, async () => failure);

    expect(await provider.fetchFeed('work')).toBe(failure);
  });
});
