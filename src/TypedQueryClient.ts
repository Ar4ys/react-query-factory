import {
  DefaultOptions,
  DefaultedQueryObserverOptions,
  FetchQueryOptions,
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
  SetDataOptions,
  Updater,
  WithRequired,
} from '@tanstack/react-query';

/** TODO: Documentation */
export class TypedQueryClient {
  constructor(public queryClient: QueryClient) {}

  // isFetching(filters?: QueryFilters): number {}

  // isMutating(filters?: MutationFilters): number {}

  // getQueryData<TQueryFnData = unknown>(
  //   queryKey: QueryKey,
  //   filters?: QueryFilters,
  // ): TQueryFnData | undefined {}

  // ensureQueryData<
  //   TQueryFnData = unknown,
  //   TError = unknown,
  //   TData = TQueryFnData,
  //   TQueryKey extends QueryKey = QueryKey,
  // >(
  //   options: WithRequired<FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey'>,
  // ): Promise<TData> {}

  // getQueriesData<TQueryFnData = unknown>(
  //   filters: QueryFilters,
  // ): [QueryKey, TQueryFnData | undefined][] {}

  // setQueryData<TQueryFnData>(
  //   queryKey: QueryKey,
  //   updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
  //   options?: SetDataOptions,
  // ): TQueryFnData | undefined {}

  // setQueriesData<TQueryFnData>(
  //   filters: QueryFilters,
  //   updater: Updater<TQueryFnData | undefined, TQueryFnData | undefined>,
  //   options?: SetDataOptions,
  // ): [QueryKey, TQueryFnData | undefined][] {}

  // getQueryState<TQueryFnData = unknown, TError = undefined>(
  //   queryKey: QueryKey,
  //   filters?: QueryFilters,
  // ): QueryState<TQueryFnData, TError> | undefined {}

  // removeQueries(filters?: QueryFilters): void {}

  // resetQueries<TPageData = unknown>(
  //   filters?: ResetQueryFilters<TPageData>,
  //   options?: ResetOptions,
  // ): Promise<void> {}

  // cancelQueries(filters?: QueryFilters, options?: CancelOptions): Promise<void> {}

  // invalidateQueries<TPageData = unknown>(
  //   filters?: InvalidateQueryFilters<TPageData>,
  //   options?: InvalidateOptions,
  // ): Promise<void> {}

  // refetchQueries<TPageData = unknown>(
  //   filters?: RefetchQueryFilters<TPageData>,
  //   options?: RefetchOptions,
  // ): Promise<void> {}

  // fetchQuery<
  //   TQueryFnData = unknown,
  //   TError = unknown,
  //   TData = TQueryFnData,
  //   TQueryKey extends QueryKey = QueryKey,
  // >(options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>): Promise<TData> {}

  // prefetchQuery<
  //   TQueryFnData = unknown,
  //   TError = unknown,
  //   TData = TQueryFnData,
  //   TQueryKey extends QueryKey = QueryKey,
  // >(options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>): Promise<void> {}

  // fetchInfiniteQuery<
  //   TQueryFnData = unknown,
  //   TError = unknown,
  //   TData = TQueryFnData,
  //   TQueryKey extends QueryKey = QueryKey,
  // >(
  //   options: FetchInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  // ): Promise<InfiniteData<TData>> {}

  // prefetchInfiniteQuery<
  //   TQueryFnData = unknown,
  //   TError = unknown,
  //   TData = TQueryFnData,
  //   TQueryKey extends QueryKey = QueryKey,
  // >(options: FetchInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey>): Promise<void> {}

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

  // setQueryDefaults(
  //   queryKey: QueryKey,
  //   options: QueryObserverOptions<unknown, any, any, any>,
  // ): void {
  //   this.queryClient.setQueryDefaults(queryKey, options);
  // }

  // getQueryDefaults(queryKey?: QueryKey): QueryObserverOptions<any, any, any, any, any> | undefined {
  //   return this.queryClient.getQueryDefaults(queryKey);
  // }

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
