import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';
import { z } from 'zod';
import { Result } from '../lib/result.ts';
import { parseSchema } from '../schemas/parse.ts';

describe('parseSchema', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the transformed output and its inferred type', () => {
    const schema = z.object({ count: z.string().transform(Number) });

    const result = parseSchema(schema, { count: '3' });

    expect(result).toEqual(Result.succeed({ count: 3 }));
    expectTypeOf(result).toEqualTypeOf<Result<{ count: number }, Error>>();
  });

  it('preserves Promise-valued schema output without awaiting it', () => {
    const input = Promise.resolve('value');

    const result = parseSchema(z.unknown(), input);

    if (Result.isFailure(result)) throw result.error;
    expect(result.value).toBe(input);
    expect(result).not.toBeInstanceOf(Promise);
  });

  it('preserves the original ZodError and its issues', () => {
    const schema = z.object({ count: z.number() });
    const input = { count: 'invalid' };
    const parsed = schema.safeParse(input);
    if (parsed.success) throw new Error('Expected invalid fixture');
    vi.spyOn(schema, 'safeParse').mockReturnValue(parsed);

    const result = parseSchema(schema, input);

    expect(Result.unwrapError(result)).toBe(parsed.error);
    expect(Result.unwrapError(result)).toBeInstanceOf(z.ZodError);
  });

  it('preserves errors thrown by schema transformations', () => {
    const error = new Error('transformation failed');
    const schema = z.string().transform(() => {
      throw error;
    });

    expect(Result.unwrapError(parseSchema(schema, 'input'))).toBe(error);
  });

  it('normalizes non-Error transformation failures', () => {
    const schema = z.string().transform(() => {
      throw 'invalid transformation';
    });

    expect(parseSchema(schema, 'input')).toEqual(Result.fail(new Error('invalid transformation')));
  });
});
