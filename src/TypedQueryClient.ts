import { Query, QueryFilters } from '@tanstack/react-query';

import {
  AnyGlobalKeyDef,
  AnyKey,
  AnyKeyDef,
  AnyKeyMeta,
  AnyKeyObj,
  AnyNonDefKey,
  GetKeyValue,
  GlobalKeyDef,
  KeyDef,
  KeyFn,
  KeyObj,
  KeyValue,
} from './createQueryKeys';
import { Mutable, todo } from './utils';

type NestedKeysToUnion<TNested extends Record<any, AnyNonDefKey>> = {
  [K in keyof TNested]: TNested[K] extends KeyObj<
    KeyValue,
    AnyKeyMeta,
    infer INested extends Record<any, any>
  >
    ? TNested[K] | NestedKeysToUnion<INested>
    : TNested[K] extends KeyFn<KeyValue, AnyKeyMeta, infer INested extends Record<any, any>>
    ? ReturnType<TNested[K]> | NestedKeysToUnion<INested>
    : never;
}[keyof TNested];

type ResolveNestedKeys<TKey extends AnyKey, TExact extends boolean = false> =
  | TKey
  | (TExact extends false
      ? TKey extends
          | KeyObj<KeyValue, AnyKeyMeta, infer INested extends Record<any, any>>
          | KeyFn<KeyValue, AnyKeyMeta, infer INested extends Record<any, any>>
          | KeyDef<KeyValue, KeyObj<KeyValue, AnyKeyMeta, infer INested extends Record<any, any>>>
          | GlobalKeyDef<KeyValue, infer INested extends Record<any, any>>
        ? NestedKeysToUnion<INested>
        : never
      : never);

type AnyTestKey = AnyKeyObj | AnyKeyDef | AnyGlobalKeyDef;

type MapKeyToQuery<TKey extends AnyKey> = TKey extends KeyObj<infer K, infer Meta, Record<any, any>>
  ? Query<Meta['TReturn'], unknown, Meta['TData'], K>
  : TKey extends KeyFn<KeyValue, infer Meta, Record<any, any>>
  ? Query<Meta['TReturn'], unknown, Meta['TData'], GetKeyValue<ReturnType<TKey>>>
  : TKey extends KeyDef<KeyValue, infer BoundKey>
  ? MapKeyToQuery<BoundKey>
  : never;

type TypedQueryFilters<TKey extends AnyTestKey, TExact extends boolean = false> = Omit<
  QueryFilters,
  'predicate' | 'queryKey' | 'exact'
> & {
  /** Include queries matching this query key */
  queryKey?: TKey;
  /** Include queries matching this predicate function */
  // TODO: ((query) => boolean) | ((query) => query is TQuery) | ((query) => TQuery | Falsy)
  predicate?: (query: MapKeyToQuery<ResolveNestedKeys<TKey, TExact>>) => boolean;
  /** Match query key exactly */
  exact?: TExact;
};

/**
 * TODO: Create this utility
 *
 * It is needed because TS is too dumb to properly discriminate types with multiple generics,
 * instead it just discriminates generics.
 *
 * TODO: Documentation
 */
function matchQueryByKey<T extends Query<any, any, any, any>, K extends AnyKey | KeyValue>(
  query: T,
  key: K,
): query is Extract<T, Query<any, any, any, K extends AnyKey ? GetKeyValue<K> : Mutable<K>>> {
  return todo();
}

if (import.meta.vitest) {
  const { describe, test, expect, assertType } = await import('vitest');
  const { createQueryKeys } = await import('./createQueryKeys');

  type Q<TData, TKey extends KeyValue> = Query<TData, unknown, TData, TKey>;

  describe('TypedQueryFilters', () => {
    const testKeys = createQueryKeys('test', (key) => ({
      all: key(),
      detail: key.dynamic<string, [userId: string]>(),
      list: key<boolean>()({
        search: key.dynamic<string, { lol: string }>(),
      }),
      byId: key.dynamic<boolean, [id: string]>()({
        likes: key<number>(),
      }),
    }));

    function testFilter<TKey extends AnyTestKey, TExact extends boolean = false>(
      _filter: TypedQueryFilters<TKey, TExact>,
    ) {}

    test('typing', () => {
      testFilter({
        exact: false,
        queryKey: testKeys.detail(''),
        predicate(query) {
          assertType<Q<string, ['test', 'detail', [userId: string]]>>(query);
          return true;
        },
      });

      testFilter({
        exact: false,
        queryKey: testKeys.detail._def,
        predicate(query) {
          assertType<Q<string, ['test', 'detail', [userId: string]]>>(query);
          return true;
        },
      });

      testFilter({
        exact: false,
        queryKey: testKeys.list,
        predicate(query) {
          assertType<
            Q<boolean, ['test', 'list']> | Q<string, ['test', 'list', 'search', [{ lol: string }]]>
          >(query);
          return true;
        },
      });

      testFilter({
        exact: true,
        queryKey: testKeys.list,
        predicate(query) {
          assertType<Q<boolean, ['test', 'list']>>(query);
          return true;
        },
      });

      testFilter({
        exact: false,
        queryKey: testKeys.byId._def,
        predicate(query) {
          assertType<
            | Q<boolean, ['test', 'byId', [id: string]]>
            | Q<number, ['test', 'byId', [id: string], 'likes']>
          >(query);
          return true;
        },
      });
    });
  });

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
