import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { USER_AGENT } from '../constants/http.ts';
import { fetchBytes, fetchJson, fetchText } from '../lib/http.ts';

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
  read: (url: string, init?: RequestInit) => Promise<unknown>;
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

      expect(await transport.read(url)).toEqual(transport.expected);

      expect(fetchMock).toHaveBeenCalledExactlyOnceWith(url, { headers: expect.any(Headers) });
      const headers = new Headers(fetchMock.mock.calls[0]?.[1]?.headers);
      expect(headers.get('user-agent')).toBe(USER_AGENT);
      expect(headers.get('accept')).toBe(transport.accept);
    });

    it('rejects non-OK status before reading the response body', async () => {
      const response = new Response('not a successful body', { status: 503 });
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

      await expect(transport.read(url, { method: 'POST' })).rejects.toThrow(
        `GET ${url} failed: 503`,
      );
      expect(response.bodyUsed).toBe(false);
    });

    it('preserves body-reader errors', async () => {
      const error = new Error('body read failed');
      const response = transport.response();
      vi.spyOn(response, transport.reader).mockRejectedValue(error);
      vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response));

      await expect(transport.read(url)).rejects.toBe(error);
    });
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

  it('preserves network errors', async () => {
    const error = new Error('connection failed');
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(error));

    await expect(fetchJson(url, schema)).rejects.toBe(error);
  });

  it('returns the parsed schema output, including transformations', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"count":"3"}')));
    const schema = z.object({ count: z.string().transform(Number) });

    expect(await fetchJson(url, schema)).toEqual({ count: 3 });
  });

  it('rejects JSON that does not match the schema', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{"ok":"true"}')));

    await expect(fetchJson(url, schema)).rejects.toBeInstanceOf(z.ZodError);
  });

  it('rejects malformed JSON before schema validation', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('not JSON')));

    await expect(fetchJson(url, schema)).rejects.toBeInstanceOf(SyntaxError);
  });
});
