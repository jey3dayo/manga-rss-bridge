import { expect, vi } from 'vitest';
import { Result } from '../../lib/result.ts';
import { getProvider } from '../../providers/index.ts';

const provider = (id: string) => {
  const found = getProvider(id);
  if (!found) throw new Error(`Provider not registered: ${id}`);
  return found;
};

export const mockResponses = (responses: Record<string, string | Uint8Array>) => {
  const fetchMock = vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    const body = responses[url];
    if (body === undefined) throw new Error(`Unexpected request: ${url}`);
    return new Response(typeof body === 'string' ? body : new Uint8Array(body));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

export const successfulFeed = async (id: string, identifier: string) => {
  const result = await provider(id).fetchFeed(identifier);
  if (Result.isFailure(result)) throw result.error;
  return result.value;
};

export const failedFeed = async (id: string, identifier: string) => {
  const result = await provider(id).fetchFeed(identifier);
  if (Result.isSuccess(result)) throw new Error(`Expected ${id} to return a failure Result`);
  expect(result.error).toBeInstanceOf(Error);
  return result.error;
};
