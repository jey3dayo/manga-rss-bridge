import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { USER_AGENT } from '../constants/http.ts';
import { fetchJson, fetchText } from '../lib/http.ts';

describe('http helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps default JSON headers when callers pass extra headers', async () => {
    const calls: RequestInit[] = [];
    const fetchMock: typeof fetch = async (_input, init) => {
      calls.push(init ?? {});
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    };
    vi.stubGlobal('fetch', fetchMock);

    await fetchJson('https://example.com/data.json', z.object({ ok: z.boolean() }), {
      headers: { Authorization: 'Bearer token' },
    });

    const call = calls.at(0);
    if (!call) throw new Error('fetch was not called');
    const headers = new Headers(call.headers);
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('user-agent')).toBe(USER_AGENT);
    expect(headers.get('authorization')).toBe('Bearer token');
  });

  it('keeps default text headers when callers pass extra headers', async () => {
    const calls: RequestInit[] = [];
    const fetchMock: typeof fetch = async (_input, init) => {
      calls.push(init ?? {});
      return new Response('ok');
    };
    vi.stubGlobal('fetch', fetchMock);

    await fetchText('https://example.com/page', {
      headers: { Cookie: 'a=b' },
    });

    const call = calls.at(0);
    if (!call) throw new Error('fetch was not called');
    const headers = new Headers(call.headers);
    expect(headers.get('user-agent')).toBe(USER_AGENT);
    expect(headers.get('cookie')).toBe('a=b');
  });
});
