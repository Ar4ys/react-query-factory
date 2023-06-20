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
import { Falsy } from './utils';

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

export type TypedQueryFilters<
  TKey extends AnyTestKey,
  TExact extends boolean = false,
  TQuery extends MapKeyToQuery<ResolveNestedKeys<TKey, TExact>> = MapKeyToQuery<
    ResolveNestedKeys<TKey, TExact>
  >,
> = Omit<QueryFilters, 'predicate' | 'queryKey' | 'exact'> & {
  /** Include queries matching this query key */
  queryKey?: TKey;
  /** Include queries matching this predicate function */
  predicate?:
    | ((query: MapKeyToQuery<ResolveNestedKeys<TKey, TExact>>) => boolean)
    | ((query: MapKeyToQuery<ResolveNestedKeys<TKey, TExact>>) => query is TQuery)
    | ((query: MapKeyToQuery<ResolveNestedKeys<TKey, TExact>>) => TQuery | Falsy);
  /** Match query key exactly */
  exact?: TExact;
};

if (import.meta.vitest) {
  const { describe, test, assertType } = await import('vitest');
  const { matchQueryByKey } = await import('./matchQueryByKey');
  const { createQueryKeys } = await import('./createQueryKeys');

  type Q<TData, TKey extends KeyValue> = Query<TData, unknown, TData, TKey>;

  describe('TypedQueryFilters', () => {
    const testKeys = createQueryKeys('test', (key) => ({
      all: key<number>(),
      detail: key.dynamic<string, [userId: string]>(),
      list: key<boolean>()({
        search: key.dynamic<string, { lol: string }>(),
      }),
      byId: key.dynamic<boolean, [id: string]>()({
        likes: key<number>(),
      }),
    }));

    function testFilterType<
      TKey extends AnyTestKey,
      TExact extends boolean = false,
      TQuery extends MapKeyToQuery<ResolveNestedKeys<TKey, TExact>> = MapKeyToQuery<
        ResolveNestedKeys<TKey, TExact>
      >,
    >(_filter: TypedQueryFilters<TKey, TExact, TQuery>): TQuery {
      return null!;
    }

    describe('queryKey', () => {
      test('static key', () => {
        type Expected = Q<number, ['test', 'all']>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.all,
          }),
        );
      });

      test('dynamic key', () => {
        type Expected = Q<string, ['test', 'detail', [userId: string]]>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.detail(''),
          }),
        );
      });

      test('dynamic key def', () => {
        type Expected = Q<string, ['test', 'detail', [userId: string]]>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.detail._def,
          }),
        );
      });

      test('nested static key', () => {
        type Expected =
          | Q<boolean, ['test', 'list']>
          | Q<string, ['test', 'list', 'search', [{ lol: string }]]>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.list,
          }),
        );
      });

      test('nested static exact', () => {
        type Expected = Q<boolean, ['test', 'list']>;
        assertType<Expected>(
          testFilterType({
            exact: true,
            queryKey: testKeys.list,
          }),
        );
      });

      test('nested dynamic def', () => {
        type Expected =
          | Q<boolean, ['test', 'byId', [id: string]]>
          | Q<number, ['test', 'byId', [id: string], 'likes']>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.byId._def,
          }),
        );
      });
    });

    describe('predicate', () => {
      test('(query) => boolean', () => {
        type Expected =
          | Q<boolean, ['test', 'list']>
          | Q<string, ['test', 'list', 'search', [{ lol: string }]]>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.list,
            predicate: () => true,
          }),
        );
      });

      test('(query) => query is TQuery', () => {
        type Expected = Q<boolean, ['test', 'list']>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.list,
            predicate: (query): query is Extract<typeof query, { queryKey: ['test', 'list'] }> =>
              true,
          }),
        );
      });

      test('(query) => TQuery | Falsy', () => {
        type Expected = Q<boolean, ['test', 'list']>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.list,
            predicate: (query) => query as Extract<typeof query, { queryKey: ['test', 'list'] }>,
          }),
        );
      });

      test('(query) => TQuery | Falsy [matchQueryByKey]', () => {
        type Expected = Q<boolean, ['test', 'list']>;
        assertType<Expected>(
          testFilterType({
            exact: false,
            queryKey: testKeys.list,
            predicate: (query) => matchQueryByKey(query, ['test', 'list'] as const) && query,
          }),
        );
      });
    });
  });
}
