import { Query, QueryFilters, QueryState } from '@tanstack/react-query';

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
  KeyMeta,
  KeyObj,
  KeyType,
  KeyValue,
} from './createQueryKeys';
import { Falsy, Mutable } from './utils';

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

export type ResolveNestedKeys<TKey extends AnyKey, TExact extends boolean = false> =
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

/**
 * `KeyFn` cannot be used for filtering, as it is a function that requires passing user-defined
 * params. It's return value (which is `KeyObj`) should be used instead.
 */
export type AnyFilterKey = AnyKeyObj | AnyKeyDef | AnyGlobalKeyDef;

export type KeyToQuery<TKey extends AnyKey> = TKey extends KeyObj<
  infer K,
  infer Meta,
  Record<any, any>
>
  ? Query<Meta['TReturn'], unknown, Meta['TData'], K>
  : TKey extends KeyFn<KeyValue, infer Meta, Record<any, any>>
  ? Query<Meta['TReturn'], unknown, Meta['TData'], GetKeyValue<ReturnType<TKey>>>
  : TKey extends KeyDef<KeyValue, infer BoundKey>
  ? KeyToQuery<BoundKey>
  : never;

export type NestedKeysToQuery<TKey extends AnyKey, TExact extends boolean = false> = KeyToQuery<
  ResolveNestedKeys<TKey, TExact>
>;

export type TypedQueryFilters<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
> = Omit<QueryFilters, 'predicate' | 'queryKey' | 'exact'> & {
  /** Include queries matching this query key */
  queryKey?: TKey;
  /** Include queries matching this predicate function */
  predicate?:
    | ((query: NestedKeysToQuery<TKey, TExact>) => boolean)
    | ((query: NestedKeysToQuery<TKey, TExact>) => query is TQuery)
    | ((query: NestedKeysToQuery<TKey, TExact>) => TQuery | Falsy);
  /** Match query key exactly */
  exact?: TExact;
};

type AnyQuery = Query<any, any, any, any>;

export type GetKeyFromQuery<T extends AnyQuery> = KeyObj<T['queryKey'], GetMetaFromQuery<T>>;

export type GetMetaFromQuery<T extends AnyQuery> = T extends Query<
  infer IReturn,
  any,
  infer IData,
  any
>
  ? KeyMeta<KeyType.Static, IReturn, IData>
  : never;

// `TKey extends any` is needed here to create "distributive" operation
// See: https://stackoverflow.com/a/62085569/13157478
// See: https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#distributive-conditional-types
export type GetOptionalKeyQueryTuple<TKey extends AnyKey> = TKey extends any
  ? [GetKeyValue<TKey>, KeyToQuery<TKey> | undefined]
  : never;

// TODO: TError
export type GetQueryState<TQuery extends AnyQuery> = TQuery extends any
  ? QueryState<GetMetaFromQuery<TQuery>['TReturn'], unknown>
  : never;

export function typedQueryFilterToRegular<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
>(filters: TypedQueryFilters<TKey, TExact, TQuery>): QueryFilters;
export function typedQueryFilterToRegular<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
>(filters?: TypedQueryFilters<TKey, TExact, TQuery>): QueryFilters | undefined;
export function typedQueryFilterToRegular(
  filters?: TypedQueryFilters<any, any, any>,
): QueryFilters | undefined {
  return filters
    ? {
        ...filters,
        queryKey: typedQueryKeyToRegular(filters.queryKey),
        predicate: filters.predicate && ((query) => Boolean(filters.predicate!(query as Query))),
      }
    : undefined;
}

export function typedQueryKeyToRegular<TKey extends AnyFilterKey>(
  queryKey: TKey,
): GetKeyValue<TKey>;
export function typedQueryKeyToRegular<TKey extends AnyFilterKey>(
  queryKey?: TKey,
): GetKeyValue<TKey> | undefined;
export function typedQueryKeyToRegular(queryKey?: AnyFilterKey): Required<KeyValue> | undefined {
  if (!queryKey) return;
  return 'queryKey' in queryKey ? queryKey.queryKey : queryKey;
}

if (import.meta.vitest) {
  const { describe, test, assertType } = await import('vitest');
  const { matchQueryByKey } = await import('./matchQueryByKey');
  const { createQueryKeys } = await import('./createQueryKeys');

  type Q<TData = unknown, TKey extends KeyValue = readonly unknown[]> = Query<
    TData,
    unknown,
    TData,
    TKey
  >;

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
      TKey extends AnyFilterKey,
      TExact extends boolean = false,
      TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
    >(_filter: TypedQueryFilters<TKey, TExact, TQuery>): TQuery {
      return null!;
    }

    describe('empty', () => {
      test('empty', () => {
        type Expected = Q;
        assertType<Expected>(testFilterType({}));
      });

      describe('with predicate', () => {
        test('(query) => boolean', () => {
          type Expected = Q;
          assertType<Expected>(
            testFilterType({
              predicate(query): boolean {
                assertType<Expected>(query);
                return true;
              },
            }),
          );
        });

        test('(query) => query is TQuery', () => {
          type Expected = Q<string, ['lol']>;
          assertType<Expected>(
            testFilterType({
              predicate(query): query is Expected {
                return true;
              },
            }),
          );
        });

        test('(query) => TQuery | undefined', () => {
          type Expected = Q<string, ['lol']>;
          assertType<Expected>(
            testFilterType({
              predicate: (query) => query as Expected,
            }),
          );
        });
      });
    });

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

        type A = GetKeyFromQuery<Expected>;
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
