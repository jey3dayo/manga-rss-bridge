import type { z } from 'zod';
import { Result, toError } from '../lib/result.ts';

export const parseSchema = <Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): Result<z.output<Schema>, Error> =>
  Result.pipe(
    Result.try({ try: () => schema.safeParse(input), catch: toError }),
    Result.andThen((parsed): Result<z.output<Schema>, Error> => {
      if (!parsed.success) return Result.fail(parsed.error);
      // Preserve the schema output verbatim; Result.succeed unwraps promise values.
      return { type: 'Success', value: parsed.data };
    }),
  );
