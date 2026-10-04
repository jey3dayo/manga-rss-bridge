import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { USER_AGENT } from '../constants/http.ts';
import { fetchBytes, fetchJson, fetchText } from './http.ts';
import { Result, type ResultAsync } from './result.ts';

const url = 'https://example.com/resource';
const schema = z.object({ ok: z.boolean() });
const transports = [
  {
    name: 'JSON',
    read: (url: string, init?: RequestInit) => fetchJson(url, schema, init),
    response: () => new Response('{"ok":true}'),
    expected: { ok: true },
    reader: 'json',
    accept: 'application/json',
  },
  {
    name: 'text',
    read: fetchText,
    response: () => new Response('本文 & text'),
    expected: '本文 & text',
    reader: 'text',
    accept: null,
  },
  {
    name: 'bytes',
    read: fetchBytes,
    response: () => new Response(Uint8Array.from([0, 128, 255])),
    expected: Uint8Array.from([0, 128, 255]),
    reader: 'arrayBuffer',
    accept: null,
  },
] satisfies {
  name: string;
  read: (url: string, init?: RequestInit) => ResultAsync<unknown, Error>;
  response: () => Response;
  expected: unknown;
  reader: 'json' | 'text' | 'arrayBuffer';
  accept: string | null;
}[];

const headerInputs: { name: string; headers: () => NonNullable<RequestInit['headers']> }[] = [
  {
    name: 'object',
    headers: () => ({ accept: 'custom/type', 'USER-AGENT': 'custom-agent' }),
  },
  {
    name: 'tuples',
    headers: () => [
      ['accept', 'custom/type'],
      ['USER-AGENT', 'custom-agent'],
    ],
  },
  {
    name: 'Headers',
    headers: () => new Headers({ accept: 'custom/type', 'USER-AGENT': 'custom-agent' }),
  },
];

describe('http helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe.each(transports)('$name transport', (transport) => {
    it('returns its response body and uses default headers', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(transport.response());
      vi.stubGlobal('fetch', fetchMock);

      expect(await transport.read(url)).toEqual(Result.succeed(transport.expected));

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, { headers: expect.any(Headers) });
      const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      expect(headers.get('user-agent')).toBe(USER_AGENT);
      expect(headers.get('accept')).toBe(transport.accept);
    });

    it('returns non-OK status failures before reading the response body', async () => {
      const response = new Response('not a successful body', { status: 503 });
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

      expect(await transport.read(url, { method: 'POST' })).toEqual(
        Result.fail(new Error(`GET ${url} failed: 503`)),
      );
      expect(response.bodyUsed).toBe(false);
    });

    it('preserves body-reader errors', async () => {
      const error = new Error('body read failed');
      const response = transport.response();
      vi.spyOn(response, transport.reader).mockRejectedValue(error);
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

      const result = await transport.read(url);

      expect(Result.unwrapError(result)).toBe(error);
    });
  });

  it('preserves network errors', async () => {
    const error = new Error('connection failed');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(error));

    const result = await fetchJson(url, schema);

    expect(Result.unwrapError(result)).toBe(error);
  });

  it('returns invalid header failures before fetching', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchJson(url, schema, { headers: { 'invalid header': 'value' } });

    expect(Result.unwrapError(result)).toBeInstanceOf(TypeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps default headers alongside caller headers and request options', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);
    const init: RequestInit = {
      method: 'POST',
      body: 'request body',
      redirect: 'manual',
      cache: 'no-store',
      signal: new AbortController().signal,
      headers: { 'X-Fixture': 'test-value' },
    };

    await fetchJson(url, schema, init);

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, {
      ...init,
      headers: expect.any(Headers),
    });
    const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(headers.get('user-agent')).toBe(USER_AGENT);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('x-fixture')).toBe('test-value');
    expect(init.headers).toEqual({ 'X-Fixture': 'test-value' });
  });

  it.each(headerInputs)('allows case-insensitive overrides from $name headers', async (input) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetchMock);
    const headers = input.headers();
    const original = [...new Headers(headers)];

    await fetchJson(url, schema, { headers });

    const merged = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
    expect(merged.get('accept')).toBe('custom/type');
    expect(merged.get('user-agent')).toBe('custom-agent');
    expect([...new Headers(headers)]).toEqual(original);
  });

  it('returns the parsed schema output, including transformations', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"count":"3"}')));
    const schema = z.object({ count: z.string().transform(Number) });

    expect(await fetchJson(url, schema)).toEqual(Result.succeed({ count: 3 }));
  });

  it('returns a ZodError for JSON that does not match the schema', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":"true"}')));

    expect(Result.unwrapError(await fetchJson(url, schema))).toBeInstanceOf(z.ZodError);
  });

  it('returns malformed JSON failures before schema validation', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')));
    const parse = vi.spyOn(schema, 'safeParse');

    expect(Result.unwrapError(await fetchJson(url, schema))).toBeInstanceOf(SyntaxError);
    expect(parse).not.toHaveBeenCalled();
  });

  it('preserves thrown schema transformation errors', async () => {
    const error = new Error('transformation failed');
    const schema = z.unknown().transform(() => {
      throw error;
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{}')));

    expect(Result.unwrapError(await fetchJson(url, schema))).toBe(error);
  });
});
