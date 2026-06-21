import type { z } from 'zod';
import { USER_AGENT } from '../constants/http.js';

export const fetchJson = async <Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  init?: RequestInit,
): Promise<z.output<Schema>> => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': USER_AGENT,
      ...init?.headers,
    },
    ...init,
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return schema.parse(await response.json());
};

export const fetchText = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      ...init?.headers,
    },
    ...init,
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response.text();
};
