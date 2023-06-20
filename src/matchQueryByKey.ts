import { Query } from '@tanstack/react-query';

import { AnyKey, GetKeyValue, KeyValue } from './createQueryKeys';
import { Mutable, todo } from './utils';

/**
 * TODO: Create this utility
 *
 * It is needed because TS is too dumb to properly discriminate types with multiple generics,
 * instead it just discriminates generics.
 *
 * TODO: Documentation
 */
export function matchQueryByKey<T extends Query<any, any, any, any>, K extends AnyKey | KeyValue>(
  query: T,
  key: K,
): query is Extract<T, Query<any, any, any, K extends AnyKey ? GetKeyValue<K> : Mutable<K>>> {
  return todo();
}

if (import.meta.vitest) {
  const { describe, test, expect, assertType } = await import('vitest');

  type Q<TData, TKey extends KeyValue> = Query<TData, unknown, TData, TKey>;

  describe('matchQueryByKey', () => {
    test('works?', () => {
      const query: Q<boolean, ['one', 'two']> | Q<number, ['one', 'two', 'three']> = {
        queryKey: ['one', 'two'],
        state: {
          data: true,
        },
      } as any as Query<any, any, any, any>;

      if (query.queryKey.length === 2) {
        // It error here is gone - TS probably correctly discriminates types with multiple generics.
        // If that is the case - deprecate `matchQueryByKey`, as it is useless now.
        // @ts-expect-error
        assertType<Q<boolean, ['one', 'two']>>(query);
      }

      expect(matchQueryByKey(query, ['one', 'two'] as const)).toBe(true);
      if (matchQueryByKey(query, ['one', 'two'] as const)) {
        assertType<Q<boolean, ['one', 'two']>>(query);
      }
    });
  });
}
