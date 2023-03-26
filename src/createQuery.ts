import {
  QueryKey,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

import { DynamicKey, DynamicKeyMeta, Key, KeyMeta } from './createQueryKeys';

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
  TArgs,
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
