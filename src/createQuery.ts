import {
  QueryKey,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';

import type { DynamicKey, DynamicKeyMeta, Key, KeyMeta } from './createQueryKeys';
import type { QueryFunction } from './createReactQueryFactories';

type UseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  TanstackUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'getNextPageParam' | 'getPreviousPageParam' | 'queryFn' | 'queryKey'
>;

type QueryConfig<
  TConfig,
  TArgs extends any[],
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = {
  /**
   * TODO: Should we give user ability to return falsy value in order to disable query (set `enable:
   * false` under the hood)? This will complicate hook "helpers" (e.g what should
   * fetch/prefetch/ensureData do, if `request` returns falsy value?)
   *
   * **Objection!**
   *
   * Yes, we definitely should allow user return falsy value in order to disable query. Hook
   * "helpers" should just do nothing, when `request` returns falsy value. Otherwise, if we require
   * `TConfig` to be always returned , user will need to use "non null assertion" operator in order
   * to satisfy TS, which will worsen DX and introduce the risk of bugs.
   *
   * The only problem currently is `QueryClient#ensureQueryData` and `QueryClient#fetchQueryData`
   * typing. Those methods return `Promise<TData>` as they expect `queryFn` to be always present.
   * Our wrappers for those methods will need to account for possible absence of request config
   * (disabled query) and reflect that in return type (`Promise<TData>` if request config is always
   * present and `Promise<TData> | undefined` if request config is possibly absent)
   */
  request: ((...args: TArgs) => TConfig | undefined | null | false) | TConfig;
  useOptions?:
    | UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
    | ((...args: TArgs) => UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>);
};

type UseQueryHook<
  TResponse,
  TError = unknown,
  TData = TResponse,
  TQueryKey extends QueryKey = QueryKey,
> = <TTData = TData>(
  queryOpts?: UseQueryOptions<TResponse, TError, TTData, TQueryKey>,
) => UseQueryResult<TTData, TError>;

type UseQueryHookWithArgs<
  TResponse,
  TArgs extends any[],
  TError = unknown,
  TData = TResponse,
  TQueryKey extends QueryKey = QueryKey,
> = <TTData = TData>(
  args: TArgs,
  queryOpts?: UseQueryOptions<TResponse, TError, TTData, TQueryKey>,
) => UseQueryResult<TTData, TError>;

export type CreateQuery<TConfig> = {
  <TKey extends QueryKey, TMeta extends KeyMeta<any>, TError, TData = TMeta['returnType']>(
    queryKey: Key<TKey, TMeta>,
    config: QueryConfig<TConfig, [], TMeta['returnType'], TError, TData, TKey>,
  ): UseQueryHook<TMeta['returnType'], TError, TData, TKey>;

  <
    TKey extends QueryKey,
    TMeta extends DynamicKeyMeta<any, any>,
    TError,
    TData = TMeta['returnType'],
  >(
    queryKey: DynamicKey<TKey, TMeta>,
    config: QueryConfig<TConfig, TMeta['fnArgs'], TMeta['returnType'], TError, TData, TKey>,
  ): UseQueryHookWithArgs<TMeta['returnType'], TMeta['fnArgs'], TError, TData, TKey>;
};

type CreateQueryFactoryOptions<TConfig> = {
  queryFn: QueryFunction<TConfig>;
};

// TODO: Unit tests
// TODO: Query helpers
// TODO: Documentation
export const createQueryFactory = <TConfig>(
  options: CreateQueryFactoryOptions<TConfig>,
): CreateQuery<TConfig> => {
  function createQuery(
    queryKey: Key<QueryKey, KeyMeta<any>>,
    config: QueryConfig<TConfig, unknown[]>,
  ): UseQueryHook<unknown>;

  function createQuery(
    queryKey: DynamicKey<QueryKey, DynamicKeyMeta<any, any>>,
    config: QueryConfig<TConfig, unknown[]>,
  ): UseQueryHookWithArgs<unknown, unknown[]>;

  function createQuery(
    queryKey: Key<QueryKey, KeyMeta<any>> | DynamicKey<QueryKey, DynamicKeyMeta<any, any>>,
    { request: configRequest, useOptions: configUseOptions }: QueryConfig<TConfig, unknown[]>,
  ): UseQueryHook<unknown> | UseQueryHookWithArgs<unknown, unknown[]> {
    return (
      ...args: [args: unknown[], queryOpts?: UseQueryOptions] | [queryOpts?: UseQueryOptions<any>]
    ) => {
      const useOptions =
        typeof configUseOptions === 'function' ? configUseOptions : () => configUseOptions;
      const queryKeyFn = typeof queryKey === 'function' ? queryKey : () => queryKey;
      let queryKeyArgs: unknown[] = [];
      let queryOptionsOverrides: UseQueryOptions | undefined;

      if (Array.isArray(args[0])) {
        [queryKeyArgs, queryOptionsOverrides] = args;
      } else {
        [queryOptionsOverrides] = args;
      }

      const queryOptions = useOptions?.(...queryKeyArgs);
      const request =
        configRequest instanceof Function ? configRequest(...queryKeyArgs) : configRequest;

      const isQueryEnabled =
        (queryOptions?.enabled ?? true) &&
        (queryOptionsOverrides?.enabled ?? true) &&
        /**
         * We cannot use `Boolean(request)` here, because user can specify string or number as a
         * `TConfig`, in which case empty string and zero will be misinterpreted as falsy value and
         * will disable query (which is undesirable).
         */
        (request ?? true) !== false;

      return useQuery<any>({
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
          return options.queryFn(request, contextWithoutPageParam);
        },
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
