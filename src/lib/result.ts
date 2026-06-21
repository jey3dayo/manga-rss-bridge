import { Result as ByethrowResult } from '@praha/byethrow';

export type Result<T, E = Error> = ByethrowResult.Result<T, E>;
export type ResultAsync<T, E = Error> = ByethrowResult.ResultAsync<T, E>;

export const Result = ByethrowResult;

export const toError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  return new Error(String(error));
};

export const tryCatch = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> =>
  ByethrowResult.try({
    try: fn,
    catch: toError,
  });
