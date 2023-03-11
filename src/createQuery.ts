import {
  QueryKey,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult,
} from '@tanstack/react-query';

import { DynamicKey, Key, KeyMeta } from './createQueryKeys';

type UseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  TanstackUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'getNextPageParam' | 'getPreviousPageParam' | 'queryFn' | 'queryKey'
>;

type QueryRequestConfig<
  TConfig,
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  request: TConfig | undefined | null | false;
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
    requestConfig:
      | QueryRequestConfig<TConfig, TMeta['returnType'], TError, TData, TKey>
      | (() => QueryRequestConfig<TConfig, TMeta['returnType'], TError, TData, TKey>),
  ): UseQueryHook<TMeta['returnType'], TError, TData, TKey>;

  <
    TBaseKey extends QueryKey,
    TKey extends QueryKey,
    TMeta extends KeyMeta<any>,
    TArgs extends any[],
    TError,
    TData = TMeta['returnType'],
  >(
    queryKey: DynamicKey<TBaseKey, TKey, TMeta, TArgs>,
    requestConfig:
      | QueryRequestConfig<TConfig, TMeta['returnType'], TError, TData, [...TBaseKey, ...TKey]>
      | ((
          ...args: TArgs
        ) => QueryRequestConfig<
          TConfig,
          TMeta['returnType'],
          TError,
          TData,
          [...TBaseKey, ...TKey]
        >),
  ): UseQueryHookWithArgs<TMeta['returnType'], TArgs, TError, TData, [...TBaseKey, ...TKey]>;
};
