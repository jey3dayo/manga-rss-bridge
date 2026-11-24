import type { z } from 'zod';
import { Result, toError } from '../lib/result.ts';

const succeedVerbatim = <Value>(value: Value): Result<Value, Error> => ({
  type: 'Success',
  value,
});

export const parseSchema = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): Result<z.output<Schema>, Error> =>
  Result.pipe(
    Result.try({ try: () => schema.safeParse(input), catch: toError }),
    Result.andThen((parsed): Result<z.output<Schema>, Error> => {
      if (!parsed.success) return Result.fail(parsed.error);
      return succeedVerbatim(parsed.data);
    }),
  );

const nextDataPattern = /<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/s;

export const parseNextData = <Schema extends z.ZodType>(
  schema: Schema,
  html: string,
  source: string,
): Result<z.output<Schema>, Error> => {
  const match = nextDataPattern.exec(html);
  if (!match?.[1]) return Result.fail(new Error(`${source} __NEXT_DATA__ not found`));
  const json = match[1];
  return Result.pipe(
    Result.try({ try: (): unknown => JSON.parse(json), catch: toError }),
    Result.andThen((data) => parseSchema(schema, data)),
  );
};
