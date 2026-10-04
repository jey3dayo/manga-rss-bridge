import type { z } from 'zod';
import { HTTP_HEADERS, MIME_TYPES, USER_AGENT } from '../constants/http.ts';

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

const fetchResponse = async (
  url: string,
  init?: RequestInit,
  defaultHeaders: Record<string, string> = {},
): Promise<Response> => {
  const response = await fetch(url, {
    ...init,
    headers: mergeHeaders(
      {
        [HTTP_HEADERS.userAgent]: USER_AGENT,
        ...defaultHeaders,
      },
      init?.headers,
    ),
  });
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status}`);
  return response;
};

export const fetchJson = async <Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  init?: RequestInit,
): Promise<z.output<Schema>> => {
  const response = await fetchResponse(url, init, {
    [HTTP_HEADERS.accept]: MIME_TYPES.json,
  });
  return schema.parse(await response.json());
};

export const fetchText = async (url: string, init?: RequestInit): Promise<string> => {
  const response = await fetchResponse(url, init);
  return response.text();
};

export const fetchBytes = async (url: string, init?: RequestInit): Promise<Uint8Array> => {
  const response = await fetchResponse(url, init);
  return new Uint8Array(await response.arrayBuffer());
};
