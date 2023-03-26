import {
  ContextOptions,
  InfiniteData,
  QueryKey,
  QueryObserverOptions,
  useInfiniteQuery,
} from '@tanstack/react-query';

import type { DynamicKey, DynamicKeyMeta, Key, KeyMeta } from './createQueryKeys';
import type { QueryFunction } from './createReactQueryFactories';
import type { UseInfiniteQueryResult } from './infiniteQueryObserverResult';

type GetInfiniteDataType<T extends InfiniteData<any>> = T['pages'][number];

type GetPreviousPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  firstPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type GetNextPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  lastPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

/**
 * We are forced to copy `UseInfiniteQueryOptions` declaration here (instead of directly using it),
 * because this is the only way to fix `TData` bug (`select` breaks because `TData` must be
 * `InfiniteData` and you cannot change it).
 *
 * It is (probably) fixed in react-query v5-alpha
 */
type UseInfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
> = ContextOptions &
  Omit<
    QueryObserverOptions<TQueryFnData, TError, TData, InfiniteData<TQueryFnData>, TQueryKey>,
    'getNextPageParam' | 'getPreviousPageParam' | 'queryFn' | 'queryKey'
  >;

type InfiniteQueryConfig<
  TConfig,
  TArgs extends any[],
  TQueryFnData = unknown,
  TError = unknown,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = {
  /**
   * TODO: Should we give user ability to pass `TConfig` object directly?
   *
   * If user's API has standardized parameter, that is used for pagination (like in trpc), he should
   * be able to use it in `queryFn` (maybe we should create `infiniteQueryFn`?) in
   * `createReactQueryFactories`. In that case there is no need to force `request` to be function
   * here.
   */
  request: (
    ...args: TArgs
  ) => ((pageParam: TPageParam | undefined) => TConfig) | undefined | null | false;
  useOptions?:
    | UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey>
    | ((...args: TArgs) => UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey>);

  /**
   * This function can be set to automatically get the previous cursor for infinite queries. The
   * result will also be used to determine the value of `hasPreviousPage`.
   */
  getPreviousPageParam?: GetPreviousPageParamFunction<TQueryFnData, TPageParam>;

  /**
   * This function can be set to automatically get the next cursor for infinite queries. The result
   * will also be used to determine the value of `hasNextPage`.
   */
  getNextPageParam?: GetNextPageParamFunction<TQueryFnData, TPageParam>;
};

type UseInfiniteQueryHook<
  TResponse,
  TError = unknown,
  TData = InfiniteData<TResponse>,
  TQueryKey extends QueryKey = QueryKey,
> = <TTData = TData>(
  queryOpts?: UseInfiniteQueryOptions<TResponse, TError, TTData, TQueryKey>,
) => UseInfiniteQueryResult<TTData, TError>;

type UseInfiniteQueryHookWithArgs<
  TResponse,
  TArgs,
  TError = unknown,
  TData = InfiniteData<TResponse>,
  TQueryKey extends QueryKey = QueryKey,
> = <TTData = TData>(
  args: TArgs,
  queryOpts?: UseInfiniteQueryOptions<TResponse, TError, TTData, TQueryKey>,
) => UseInfiniteQueryResult<TTData, TError>;

export type CreateInfiniteQuery<TConfig> = {
  <
    TKey extends QueryKey,
    TMeta extends KeyMeta<InfiniteData<any>>,
    TError = unknown,
    TData = GetInfiniteDataType<TMeta['returnType']>,
    TPageParam = unknown,
  >(
    queryKey: Key<any, TMeta>,
    config: InfiniteQueryConfig<
      TConfig,
      [],
      GetInfiniteDataType<TMeta['returnType']>,
      TError,
      TData,
      TKey,
      TPageParam
    >,
  ): UseInfiniteQueryHook<GetInfiniteDataType<TMeta['returnType']>, TError, TData, TKey>;

  <
    TKey extends QueryKey,
    TMeta extends DynamicKeyMeta<InfiniteData<any>, any>,
    TError = unknown,
    TData = GetInfiniteDataType<TMeta['returnType']>,
    TPageParam = unknown,
  >(
    queryKey: DynamicKey<TKey, TMeta>,
    config: InfiniteQueryConfig<
      TConfig,
      TMeta['fnArgs'],
      GetInfiniteDataType<TMeta['returnType']>,
      TError,
      TData,
      TKey,
      TPageParam
    >,
  ): UseInfiniteQueryHookWithArgs<TMeta['returnType'], TMeta['fnArgs'], TError, TData, TKey>;
};

type CreateInfiniteQueryFactoryOptions<TConfig> = {
  queryFn: QueryFunction<TConfig>;
};

// TODO: Unit tests
// TODO: Query helpers
// TODO: Documentation
export const createInfiniteQueryFactory = <TConfig>(
  options: CreateInfiniteQueryFactoryOptions<TConfig>,
): CreateInfiniteQuery<TConfig> => {
  function createQuery(
    queryKey: Key<QueryKey, KeyMeta<any>>,
    config: InfiniteQueryConfig<TConfig, unknown[]>,
  ): UseInfiniteQueryHook<unknown>;

  function createQuery(
    queryKey: DynamicKey<QueryKey, DynamicKeyMeta<any, any>>,
    config: InfiniteQueryConfig<TConfig, unknown[]>,
  ): UseInfiniteQueryHookWithArgs<unknown, unknown[]>;

  function createQuery(
    queryKey: Key<QueryKey, KeyMeta<any>> | DynamicKey<QueryKey, DynamicKeyMeta<any, any>>,
    {
      request: configRequest,
      useOptions: configUseOptions,
      getNextPageParam,
      getPreviousPageParam,
    }: InfiniteQueryConfig<TConfig, unknown[]>,
  ): UseInfiniteQueryHook<unknown> | UseInfiniteQueryHookWithArgs<unknown, unknown[]> {
    return (
      ...args:
        | [args: unknown[], queryOpts?: UseInfiniteQueryOptions]
        | [queryOpts?: UseInfiniteQueryOptions<unknown, unknown, any>]
    ): any => {
      const useOptions =
        typeof configUseOptions === 'function' ? configUseOptions : () => configUseOptions;
      const queryKeyFn = typeof queryKey === 'function' ? queryKey : () => queryKey;
      let queryKeyArgs: unknown[] = [];
      let queryOptionsOverrides: UseInfiniteQueryOptions | undefined;

      if (Array.isArray(args[0])) {
        [queryKeyArgs, queryOptionsOverrides] = args;
      } else {
        [queryOptionsOverrides] = args;
      }

      const queryOptions = useOptions?.(...queryKeyArgs);
      const request = configRequest(...queryKeyArgs);

      const isQueryEnabled =
        (queryOptions?.enabled ?? true) &&
        (queryOptionsOverrides?.enabled ?? true) &&
        /**
         * We cannot use `Boolean(request)` here, because user can specify string or number as a
         * `TConfig`, in which case empty string and zero will be misinterpreted as falsy value and
         * will disable query (which is undesirable).
         */
        (request ?? true) !== false;

      return useInfiniteQuery<any>({
        ...queryOptions,
        ...queryOptionsOverrides,
        enabled: isQueryEnabled,
        queryKey: queryKeyFn(...queryKeyArgs).queryKey,
        queryFn(context) {
          if (!request) return;
          const contextWithoutPageParam = {
            ...context,
            pageParam: undefined,
          };
          delete contextWithoutPageParam.pageParam;
          return options.queryFn(request(context.pageParam), contextWithoutPageParam);
        },
        getNextPageParam,
        getPreviousPageParam,
        onError(...args) {
          queryOptions?.onError?.(...args);
          queryOptionsOverrides?.onError?.(...args);
        },
        onSuccess(...args) {
          queryOptions?.onSuccess?.(...args);
          queryOptionsOverrides?.onSuccess?.(...args);
        },
        onSettled(...args) {
          queryOptions?.onSettled?.(...args);
          queryOptionsOverrides?.onSettled?.(...args);
        },
      });
    };
  }

  return createQuery;
};
