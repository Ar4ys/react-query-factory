import {
  ContextOptions,
  InfiniteData,
  QueryKey,
  QueryObserverOptions,
} from '@tanstack/react-query';

import { DynamicKey, Key, KeyMeta } from './createQueryKeys';
import { UseInfiniteQueryResult } from './infiniteQueryObserverResult';

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
  TPageParam = unknown,
> = ContextOptions &
  Omit<
    QueryObserverOptions<TQueryFnData, TError, TData, InfiniteData<TQueryFnData>, TQueryKey>,
    'getNextPageParam' | 'getPreviousPageParam'
  > & {
    /**
     * This function can be set to automatically get the previous cursor for infinite queries. The
     * result will also be used to determine the value of `hasPreviousPage`.
     */
    getPreviousPageParam?: GetPreviousPageParamFunction<TQueryFnData, TPageParam>;
    /**
     * This function can be set to automatically get the next cursor for infinite queries. The
     * result will also be used to determine the value of `hasNextPage`.
     */
    getNextPageParam?: GetNextPageParamFunction<TQueryFnData, TPageParam>;
  };

type InfiniteQueryRequestConfig<
  TConfig,
  TQueryFnData = unknown,
  TError = unknown,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = UseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
  request: ((pageParam: TPageParam) => TConfig) | undefined | null | false;
};

type UseInfiniteQueryHook<
  TResponse,
  TError = unknown,
  TData = InfiniteData<TResponse>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = <TTData = TData>(
  queryOpts?: UseInfiniteQueryOptions<TResponse, TError, TTData, TQueryKey, TPageParam>,
) => UseInfiniteQueryResult<TTData, TError>;

type UseInfiniteQueryHookWithArgs<
  TResponse,
  TArgs,
  TError = unknown,
  TData = InfiniteData<TResponse>,
  TQueryKey extends QueryKey = QueryKey,
  TPageParam = unknown,
> = <TTData = TData>(
  args: TArgs,
  queryOpts?: UseInfiniteQueryOptions<TResponse, TError, TTData, TQueryKey, TPageParam>,
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
    requestConfig:
      | InfiniteQueryRequestConfig<
          TConfig,
          GetInfiniteDataType<TMeta['returnType']>,
          TError,
          TData,
          TKey,
          TPageParam
        >
      | (() => InfiniteQueryRequestConfig<
          TConfig,
          GetInfiniteDataType<TMeta['returnType']>,
          TError,
          TData,
          TKey,
          TPageParam
        >),
  ): UseInfiniteQueryHook<
    GetInfiniteDataType<TMeta['returnType']>,
    TError,
    TData,
    TKey,
    TPageParam
  >;

  <
    TBaseKey extends QueryKey,
    TKey extends QueryKey,
    TArgs extends any[],
    TMeta extends KeyMeta<InfiniteData<any>>,
    TError = unknown,
    TData = GetInfiniteDataType<TMeta['returnType']>,
    TPageParam = unknown,
  >(
    queryKey: DynamicKey<TBaseKey, TKey, TMeta, TArgs>,
    requestConfig:
      | InfiniteQueryRequestConfig<
          TConfig,
          GetInfiniteDataType<TMeta['returnType']>,
          TError,
          TData,
          [...TBaseKey, ...TKey],
          TPageParam
        >
      | ((
          ...args: TArgs
        ) => InfiniteQueryRequestConfig<
          TConfig,
          GetInfiniteDataType<TMeta['returnType']>,
          TError,
          TData,
          [...TBaseKey, ...TKey],
          TPageParam
        >),
  ): UseInfiniteQueryHookWithArgs<TMeta['returnType'], TArgs, TError, TData, TKey, TPageParam>;
};
