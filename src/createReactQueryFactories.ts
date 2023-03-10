import {
  ContextOptions,
  InfiniteData,
  QueryFunctionContext,
  QueryKey,
  QueryObserverOptions,
  UseQueryOptions as TanstackUseQueryOptions,
  UseMutationOptions,
  UseMutationResult,
  UseQueryResult,
} from '@tanstack/react-query';

import { DynamicKey, Key, KeyMeta, createQueryKeys } from './createQueryKeys';
import { UseInfiniteQueryResult } from './infiniteQueryObserverResult';

type GetPreviousPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  firstPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type GetNextPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  lastPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type UseQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = Omit<
  TanstackUseQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
  'getNextPageParam' | 'getPreviousPageParam'
>;

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

type QueryRequestConfig<
  TConfig,
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> = UseQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
  request: TConfig | undefined | null | false;
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

// TODO: Replace with `MutationRequestConfig` (similarly to `QueryRequestConfig` and `InfiniteQueryRequestConfig`)
type WithMutationRequestConfig<T, TConfig> = T & { request: TConfig };

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

// TODO: Pass Errors
type CreateQuery<TConfig> = {
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

type CreateInfiniteQuery<TConfig> = {
  <
    TKey extends QueryKey,
    TMeta extends KeyMeta<InfiniteData<any>>,
    TError = unknown,
    TData = TMeta['returnType']['pages'][number],
    TPageParam = unknown,
  >(
    queryKey: Key<any, TMeta>,
    requestConfig:
      | InfiniteQueryRequestConfig<
          TConfig,
          TMeta['returnType']['pages'][number],
          TError,
          TData,
          TKey,
          TPageParam
        >
      | (() => InfiniteQueryRequestConfig<
          TConfig,
          TMeta['returnType']['pages'][number],
          TError,
          TData,
          TKey,
          TPageParam
        >),
  ): UseInfiniteQueryHook<TMeta['returnType']['pages'][number], TError, TData, TKey, TPageParam>;

  <
    TBaseKey extends QueryKey,
    TKey extends QueryKey,
    TArgs extends any[],
    TMeta extends KeyMeta<InfiniteData<any>>,
    TError = unknown,
    TData = TMeta['returnType']['pages'][number],
    TPageParam = unknown,
  >(
    queryKey: DynamicKey<TBaseKey, TKey, TMeta, TArgs>,
    requestConfig:
      | InfiniteQueryRequestConfig<
          TConfig,
          TMeta['returnType']['pages'][number],
          TError,
          TData,
          [...TBaseKey, ...TKey],
          TPageParam
        >
      | ((
          ...args: TArgs
        ) => InfiniteQueryRequestConfig<
          TConfig,
          TMeta['returnType']['pages'][number],
          TError,
          TData,
          [...TBaseKey, ...TKey],
          TPageParam
        >),
  ): UseInfiniteQueryHookWithArgs<TMeta['returnType'], TArgs, TError, TData, TKey, TPageParam>;
};

type UseMutationHook<TResponse, TRequest> = (
  queryOpts?: UseMutationOptions<TResponse, /* Error */ unknown, TRequest>,
) => UseMutationResult<TResponse, /* Error */ unknown, TRequest>;

type CreateMutation<TConfig> = <TResponse, TRequest, TRequestModified = TRequest>(
  requestConfig:
    | WithMutationRequestConfig<
        UseMutationOptions<TResponse, /* Error */ unknown, TRequestModified>,
        TConfig
      >
    | ((
        data: TRequest,
      ) => WithMutationRequestConfig<
        UseMutationOptions<TResponse, /* Error */ unknown, TRequestModified>,
        TConfig
      >),
) => UseMutationHook<TResponse, TRequestModified>;

type ReactQueryFactories<TQueryConfig, TMutationConfig> = {
  createQuery: CreateQuery<TQueryConfig>;
  createInfiniteQuery: CreateInfiniteQuery<TQueryConfig>;
  createMutation: CreateMutation<TMutationConfig>;
};

type BaseRequestConfig = RequestInit & {
  url: string | URL;
};

type QueryFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  context: Omit<QueryFunctionContext, 'pageParam'>,
) => unknown | Promise<unknown>;

type MutationFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  data: unknown,
) => unknown | Promise<unknown>;

type CreateReactQueryFactoriesOptions<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
> = {
  /** Default implementation is `fetch` */
  queryFn: QueryFunction<TQueryConfig>;
  /** Default implementation is `fetch` with `POST` method */
  mutationFn: MutationFunction<TMutationConfig>;
};

export function createReactQueryFactories<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
>(
  options: CreateReactQueryFactoriesOptions<TQueryConfig, TMutationConfig>,
): ReactQueryFactories<TQueryConfig, TMutationConfig> {
  return null!;
}

// -------------------- Experiments ---------------------------
{
  type FancyRequest = {
    fancy: string;
  };

  const { createQuery, createInfiniteQuery, createMutation } = createReactQueryFactories({
    queryFn: (config: FancyRequest, context) => {
      context.meta;
      config.fancy;
    },
    mutationFn: (config: FancyRequest, data) => {
      return fetch(config.fancy, {
        body: JSON.stringify(data),
        ...config,
      });
    },
  });

  const test = createQueryKeys('test', (k) => ({
    lol: k<{ test: string; test2: number }>(),
    all: k.infinite<{ items: number[]; a: number }>()((test: boolean) => [test]),
  }));

  const useTestQuery = createQuery(test.lol, {
    request: {
      fancy: 'lol',
    },
    select: (data) => data.test,
  });

  const { data } = useTestQuery({
    //    ^?
    select: (data) => data.test2,
  });

  const useInfiniteQuery = createInfiniteQuery(test.all, (test) => ({
    getNextPageParam: (data) => data.a,
    //                 ^?
    request: (pageParam) => ({
      //      ^?
      fancy: pageParam.toString(),
    }),
    select: (data) => data.pages.flatMap((x) => x.items),
  }));

  const { data: infiniteData } = useInfiniteQuery([true]);
  //            ^?

  type TestMutationInput = { lol: string };
  type TestMutationResponse = { olo: number };

  const useTestMutation = createMutation<TestMutationResponse, TestMutationInput>((data) => {
    return {
      request: {
        fancy: data.lol,
      },
    };
  });

  const { data: mutationData } = useTestMutation();
  //      ^?
}
