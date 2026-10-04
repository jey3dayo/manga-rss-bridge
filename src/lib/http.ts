import type { z } from 'zod';
import { HTTP_HEADERS, MIME_TYPES, USER_AGENT } from '../constants/http.ts';
import { parseSchema } from '../schemas/parse.ts';
import { Result, type ResultAsync, toError } from './result.ts';

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

const fetchResponse = (
  url: string,
  init?: RequestInit,
  defaultHeaders: Record<string, string> = {},
): ResultAsync<Response, Error> =>
  Result.pipe(
    Result.try({
      try: async () =>
        fetch(url, {
          ...init,
          headers: mergeHeaders(
            {
              [HTTP_HEADERS.userAgent]: USER_AGENT,
              ...defaultHeaders,
            },
            init?.headers,
          ),
        }),
      catch: toError,
    }),
    Result.andThen((response) =>
      response.ok
        ? Result.succeed(response)
        : Result.fail(new Error(`GET ${url} failed: ${response.status}`)),
    ),
  );

export const fetchJson = <Schema extends z.ZodType>(
  url: string,
  schema: Schema,
  init?: RequestInit,
): ResultAsync<z.output<Schema>, Error> =>
  Result.pipe(
    fetchResponse(url, init, { [HTTP_HEADERS.accept]: MIME_TYPES.json }),
    Result.andThen((response) => Result.try({ try: async () => response.json(), catch: toError })),
    Result.andThen((body) => parseSchema(schema, body)),
  );

export const fetchText = (url: string, init?: RequestInit): ResultAsync<string, Error> =>
  Result.pipe(
    fetchResponse(url, init),
    Result.andThen((response) => Result.try({ try: async () => response.text(), catch: toError })),
  );

export const fetchBytes = (url: string, init?: RequestInit): ResultAsync<Uint8Array, Error> =>
  Result.pipe(
    fetchResponse(url, init),
    Result.andThen((response) =>
      Result.try({ try: async () => response.arrayBuffer(), catch: toError }),
    ),
    Result.map((buffer) => new Uint8Array(buffer)),
  );
