import {
  CancelOptions,
  DefaultOptions,
  DefaultedQueryObserverOptions,
  FetchQueryOptions,
  InvalidateOptions,
  InvalidateQueryFilters,
  Logger,
  MutationCache,
  MutationFilters,
  MutationKey,
  MutationObserverOptions,
  MutationOptions,
  QueryCache,
  QueryClient,
  QueryFilters,
  QueryKey,
  QueryObserverOptions,
  QueryState,
  RefetchOptions,
  RefetchPageFilters,
  RefetchQueryFilters,
  ResetOptions,
  ResetQueryFilters,
  SetDataOptions,
  Updater,
  WithRequired,
} from '@tanstack/react-query';

import {
  AnyFilterKey,
  GetKeyFromQuery,
  GetMetaFromQuery,
  GetOptionalKeyQueryTuple,
  GetQueryState,
  NestedKeysToQuery,
  ResolveNestedKeys,
  TypedQueryFilters,
  typedQueryFilterToRegular,
  typedQueryKeyToRegular,
} from './TypedQueryFilters';
import { AnyKeyObj, AnyNonDefKey, GetKeyMeta, GetKeyValue, KeyType } from './createQueryKeys';

type TypedFetchQueryOptions<TKey extends AnyKeyObj, TError = unknown> = Omit<
  FetchQueryOptions<
    GetKeyMeta<TKey>['TReturn'],
    TError,
    GetKeyMeta<TKey>['TData'],
    GetKeyValue<TKey>
  >,
  'queryKey'
> & {
  queryKey?: TKey;
};

type TypedResetQueryFilters<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
> = TypedQueryFilters<TKey, TExact, TQuery> &
  RefetchPageFilters<GetMetaFromQuery<TQuery>['TReturn']>;

type TypedRefetchQueryFilters<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
> = TypedQueryFilters<TKey, TExact, TQuery> &
  RefetchPageFilters<GetMetaFromQuery<TQuery>['TReturn']>;

// Copied from `@tanstack/query-core`
type QueryTypeFilter = 'all' | 'active' | 'inactive';

type TypedInvalidateQueryFilters<
  TKey extends AnyFilterKey,
  TExact extends boolean = false,
  TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
> = TypedQueryFilters<TKey, TExact, TQuery> &
  RefetchPageFilters<GetMetaFromQuery<TQuery>['TReturn']> & {
    refetchType?: QueryTypeFilter | 'none';
  };

type TypedQueryObserverOptions<TKey extends AnyKeyObj> = Omit<
  QueryObserverOptions<
    GetKeyMeta<TKey>['TReturn'],
    unknown,
    // TODO: Test this
    // TODO: Should we pass `TData` as unknown?
    // `TData` here is the result of `select` call. This means that if query provides
    // `select` override - `TData` here will be different from actual `TData` and user
    // will catch runtime error because shape of the data is different than expected.
    unknown,
    GetKeyMeta<TKey>['TData'],
    GetKeyValue<TKey>
  >,
  'queryKey'
> & {
  queryKey?: TKey;
};

/** TODO: Documentation */
export class TypedQueryClient {
  constructor(public queryClient: QueryClient) {}

  isFetching<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(filters?: TypedQueryFilters<TKey, TExact, TQuery>): number {
    return this.queryClient.isFetching(typedQueryFilterToRegular(filters));
  }

  // TODO: Create `TypedMutationFilters`
  isMutating(filters?: MutationFilters): number {
    return this.queryClient.isMutating(filters);
  }

  getQueryData<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    filters: TypedQueryFilters<TKey, TExact, TQuery>,
  ): GetMetaFromQuery<TQuery>['TReturn'] | undefined {
    return this.queryClient.getQueryData([], typedQueryFilterToRegular(filters));
  }

  // TODO: Add ability to pass TError
  ensureQueryData<TKey extends AnyKeyObj>(
    options: WithRequired<TypedFetchQueryOptions<TKey>, 'queryKey'>,
  ): Promise<GetKeyMeta<TKey>['TData']> {
    return this.queryClient.ensureQueryData({
      ...options,
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  getQueriesData<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    filters: TypedQueryFilters<TKey, TExact, TQuery>,
  ): GetOptionalKeyQueryTuple<GetKeyFromQuery<TQuery>>[] {
    return this.queryClient.getQueriesData(
      typedQueryFilterToRegular(filters),
    ) as GetOptionalKeyQueryTuple<GetKeyFromQuery<TQuery>>[];
  }

  setQueryData<TKey extends AnyFilterKey>(
    queryKey: TKey,
    updater: Updater<
      GetKeyMeta<ResolveNestedKeys<TKey>>['TReturn'] | undefined,
      GetKeyMeta<ResolveNestedKeys<TKey>>['TReturn'] | undefined
    >,
    options?: SetDataOptions,
  ): GetKeyMeta<ResolveNestedKeys<TKey>>['TReturn'] | undefined {
    return this.queryClient.setQueryData(typedQueryKeyToRegular(queryKey), updater, options);
  }

  setQueriesData<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    filters: TypedQueryFilters<TKey, TExact, TQuery>,
    // TODO: Should we create distributive Updated here?
    // While this will provide better type safety (updater must return the same type that it receives),
    // it makes it impossible to use without explicitly defining overloaded function
    updater: Updater<
      GetMetaFromQuery<TQuery>['TReturn'] | undefined,
      GetMetaFromQuery<TQuery>['TReturn'] | undefined
    >,
    options?: SetDataOptions,
  ): GetOptionalKeyQueryTuple<GetKeyFromQuery<TQuery>>[] {
    return this.queryClient.setQueriesData(
      typedQueryFilterToRegular(filters),
      updater,
      options,
    ) as GetOptionalKeyQueryTuple<GetKeyFromQuery<TQuery>>[];
  }

  getQueryState<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    queryKey: TKey,
    filters?: Omit<TypedQueryFilters<TKey, TExact, TQuery>, 'queryKey'>,
  ): GetQueryState<TQuery> | undefined {
    return this.queryClient.getQueryState(
      typedQueryKeyToRegular(queryKey),
      typedQueryFilterToRegular(filters),
    ) as GetQueryState<TQuery> | undefined;
  }

  removeQueries<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(filters?: TypedQueryFilters<TKey, TExact, TQuery>): void {
    return this.queryClient.removeQueries(typedQueryFilterToRegular(filters));
  }

  resetQueries<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(filters?: TypedResetQueryFilters<TKey, TExact, TQuery>, options?: ResetOptions): Promise<void> {
    return this.queryClient.resetQueries(typedQueryFilterToRegular(filters), options);
  }

  cancelQueries<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(filters?: TypedQueryFilters<TKey, TExact, TQuery>, options?: CancelOptions): Promise<void> {
    return this.queryClient.cancelQueries(typedQueryFilterToRegular(filters), options);
  }

  invalidateQueries<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    filters?: TypedInvalidateQueryFilters<TKey, TExact, TQuery>,
    options?: InvalidateOptions,
  ): Promise<void> {
    return this.queryClient.invalidateQueries(typedQueryFilterToRegular(filters), options);
  }

  refetchQueries<
    TKey extends AnyFilterKey,
    TExact extends boolean = false,
    TQuery extends NestedKeysToQuery<TKey, TExact> = NestedKeysToQuery<TKey, TExact>,
  >(
    filters?: TypedRefetchQueryFilters<TKey, TExact, TQuery>,
    options?: RefetchOptions,
  ): Promise<void> {
    return this.queryClient.refetchQueries(typedQueryFilterToRegular(filters), options);
  }

  // TODO: Add ability to pass TError
  fetchQuery<TKey extends AnyKeyObj<KeyType.Static | KeyType.Dynamic>>(
    options: WithRequired<TypedFetchQueryOptions<TKey>, 'queryKey'>,
  ): Promise<GetKeyMeta<TKey>['TData']> {
    return this.queryClient.fetchQuery({
      ...options,
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  // TODO: Add ability to pass TError
  prefetchQuery<TKey extends AnyKeyObj<KeyType.Static | KeyType.Dynamic>>(
    options: WithRequired<TypedFetchQueryOptions<TKey>, 'queryKey'>,
  ): Promise<void> {
    return this.queryClient.prefetchQuery({
      ...options,
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  fetchInfiniteQuery<TKey extends AnyKeyObj<KeyType.InfiniteStatic | KeyType.InfiniteDynamic>>(
    options: WithRequired<TypedFetchQueryOptions<TKey>, 'queryKey'>,
  ): Promise<GetKeyMeta<TKey>['TData']> {
    return this.queryClient.fetchInfiniteQuery({
      ...options,
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  prefetchInfiniteQuery<TKey extends AnyKeyObj<KeyType.InfiniteStatic | KeyType.InfiniteDynamic>>(
    options: WithRequired<TypedFetchQueryOptions<TKey>, 'queryKey'>,
  ): Promise<void> {
    return this.queryClient.prefetchInfiniteQuery({
      ...options,
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  resumePausedMutations(): Promise<unknown> {
    return this.queryClient.resumePausedMutations();
  }

  getQueryCache(): QueryCache {
    return this.queryClient.getQueryCache();
  }

  getMutationCache(): MutationCache {
    return this.queryClient.getMutationCache();
  }

  getLogger(): Logger {
    return this.queryClient.getLogger();
  }

  getDefaultOptions(): DefaultOptions {
    return this.queryClient.getDefaultOptions();
  }

  setDefaultOptions(options: DefaultOptions): void {
    this.queryClient.setDefaultOptions(options);
  }

  setQueryDefaults<TKey extends AnyKeyObj>(
    queryKey: TKey,
    options: TypedQueryObserverOptions<TKey>,
  ): void {
    this.queryClient.setQueryDefaults(typedQueryKeyToRegular(queryKey), {
      ...(options as QueryObserverOptions),
      queryKey: typedQueryKeyToRegular(options.queryKey),
    });
  }

  getQueryDefaults<TKey extends AnyKeyObj>(
    queryKey?: TKey,
  ): TypedQueryObserverOptions<TKey> | undefined {
    return this.queryClient.getQueryDefaults(typedQueryKeyToRegular(queryKey));
  }

  // TODO: We should add custom support for mutationDefaults
  // See https://tanstack.com/query/v4/docs/react/guides/mutations#persist-mutations
  setMutationDefaults(
    mutationKey: MutationKey,
    options: MutationObserverOptions<any, any, any, any>,
  ): void {
    return this.queryClient.setMutationDefaults(mutationKey, options);
  }

  getMutationDefaults(
    mutationKey?: MutationKey,
  ): MutationObserverOptions<any, any, any, any> | undefined {
    return this.queryClient.getMutationDefaults(mutationKey);
  }

  // TODO: WIP
  defaultQueryOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey extends QueryKey>(
    options?:
      | QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>
      | DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>,
  ): DefaultedQueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey> {
    return this.queryClient.defaultQueryOptions(options);
  }

  defaultMutationOptions<T extends MutationOptions<any, any, any, any>>(options?: T): T {
    return this.queryClient.defaultMutationOptions(options);
  }

  clear(): void {
    this.queryClient.clear();
  }
}

if (import.meta.vitest) {
  const { describe, test, assertType } = await import('vitest');
  const { matchQueryByKey } = await import('./matchQueryByKey');
  const { createQueryKeys } = await import('./createQueryKeys');

  const tQueryClient = new TypedQueryClient(new QueryClient());

  const testKeys = createQueryKeys('test', (key) => ({
    all: key<number>(),
    allList: key.infinite<number>(),
    detail: key.dynamic<string, [userId: string]>(),
    list: key<boolean>()({
      search: key.dynamic<string, { lol: string }>(),
    }),
    byId: key.dynamic<boolean, [id: string]>()({
      likes: key<number>(),
    }),
  }));

  const a = tQueryClient.getQueryData({
    queryKey: testKeys._def,
    // predicate: (query) => {
    //   query.queryKey;
    //   // TODO: Bullshit but works
    //   return matchQueryByKey(query, ['test', 'byId', ['asd' as string]] as const) && query;
    // },
  });

  tQueryClient.queryClient;
}
