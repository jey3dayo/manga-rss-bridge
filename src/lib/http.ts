import type { z } from 'zod';
import { USER_AGENT } from '../constants/http.ts';

const mergeHeaders = (
  defaults: RequestInit['headers'],
  headers: RequestInit['headers'],
): Headers => {
  const merged = new Headers(defaults);
  if (headers) {
    new Headers(headers).forEach((value, key) => {
      merged.set(key, value);
    });
  }
  return merged;
};

export const fetchJson = async <Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  init?: RequestInit,
): Promise<z.output<Schema>> => {
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(
      {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
      },
      init?.headers,
    ),
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return schema.parse(await response.json());
};

export const fetchText = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(
      {
        'User-Agent': USER_AGENT,
      },
      init?.headers,
    ),
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
};
