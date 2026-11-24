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
