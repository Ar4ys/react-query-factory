import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import type { AnyNonDefKey, GetKeyMeta, GetKeyValue } from './createQueryKeys';
import type { QueryFunction } from './createReactQueryFactories';
import type {
  UseInfiniteQueryOptions as TanstackUseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './tanstack-fixes';
import { NoInfer, PickRequired, QueryArgs, QueryContext } from './utils';

type GetPreviousPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  firstPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type GetNextPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  lastPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type InfiniteQueryOptions<
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
> = Omit<
  TanstackUseInfiniteQueryOptions<
    GetKeyMeta<TKey>['TReturn'],
    TError,
    NoInfer<TData>,
    GetKeyValue<TKey>
  >,
  | 'getNextPageParam'
  | 'getPreviousPageParam'
  | 'queryFn'
  | 'queryKey'
  | 'select'
  // Deprecated
  | 'onSuccess'
  | 'onError'
  | 'onSettled'
> & {
  /**
   * This option can be used to transform or select a part of the data returned by the query
   * function.
   */
  select?: (data: GetKeyMeta<TKey>['TData']) => TData;
};

type UseInfiniteQueryOptions<
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TContext = undefined,
  // TODO: Add support for select override
> = Omit<InfiniteQueryOptions<TKey, TError, TData>, 'select'> &
  QueryContext<TContext> &
  QueryArgs<GetKeyMeta<TKey>['TArgs']>;

type InfiniteQueryConfig<
  TConfig,
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TPageParam = unknown,
  TContext = undefined,
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
    args: GetKeyMeta<TKey>['TArgs'],
    pageParam: TPageParam | undefined,
  ) => TConfig | undefined | null | false;

  useOptions?:
    | InfiniteQueryOptions<TKey, TError, TData>
    | ((
        args: GetKeyMeta<TKey>['TArgs'],
        context: TContext,
      ) => InfiniteQueryOptions<TKey, TError, TData>);

  /**
   * This function can be set to automatically get the previous cursor for infinite queries. The
   * result will also be used to determine the value of `hasPreviousPage`.
   */
  getPreviousPageParam?: GetPreviousPageParamFunction<GetKeyMeta<TKey>['TReturn'], TPageParam>;

  /**
   * This function can be set to automatically get the next cursor for infinite queries. The result
   * will also be used to determine the value of `hasNextPage`.
   */
  getNextPageParam?: GetNextPageParamFunction<GetKeyMeta<TKey>['TReturn'], TPageParam>;
};

type UseInfiniteQueryHookParams<
  TKey extends AnyNonDefKey,
  TError,
  TData,
  TContext,
> = keyof PickRequired<UseInfiniteQueryOptions<TKey, TError, TData, TContext>> extends never
  ? [queryOpts?: UseInfiniteQueryOptions<TKey, TError, TData, TContext>]
  : [queryOpts: UseInfiniteQueryOptions<TKey, TError, TData, TContext>];

type UseInfiniteQueryHook<TKey extends AnyNonDefKey, TError, TData, TContext> = <TTData = TData>(
  ...args: UseInfiniteQueryHookParams<TKey, TError, TTData, TContext>
) => UseInfiniteQueryResult<TTData, TError>;

export type CreateInfiniteQuery<TConfig> = <
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TPageParam = unknown,
  TContext = undefined,
>(
  queryKey: TKey,
  config: InfiniteQueryConfig<TConfig, TKey, TError, TData, TPageParam, TContext>,
) => UseInfiniteQueryHook<TKey, TError, TData, TContext>;

type CreateInfiniteQueryFactoryOptions<TConfig> = {
  queryFn: QueryFunction<TConfig>;
};

// TODO: Query helpers
// TODO: Documentation
export const createInfiniteQueryFactory = <TConfig>(
  options: CreateInfiniteQueryFactoryOptions<TConfig>,
): CreateInfiniteQuery<TConfig> => {
  return (
    queryKey: AnyNonDefKey,
    {
      request: configRequest,
      useOptions: configUseOptions,
      getNextPageParam,
      getPreviousPageParam,
    }: InfiniteQueryConfig<TConfig, any, any, any, any, any>,
  ): UseInfiniteQueryHook<any, any, any, any> => {
    return (
      {
        args: queryKeyArgs = [],
        ctx: queryContext,
        ...queryOptionsOverrides
      }: UseInfiniteQueryOptions<any> = {} as any,
    ): any => {
      const useOptions =
        typeof configUseOptions === 'function' ? configUseOptions : () => configUseOptions;
      const queryKeyFn = typeof queryKey === 'function' ? queryKey : () => queryKey;
      const queryOptions = useOptions?.(queryKeyArgs, queryContext);
      const request = configRequest(queryKeyArgs, undefined) ?? false;

      const isQueryEnabled =
        (queryOptions?.enabled ?? true) &&
        (queryOptionsOverrides?.enabled ?? true) &&
        /**
         * We cannot use `Boolean(request)` here, because user can specify string or number as a
         * `TConfig`, in which case empty string and zero will be misinterpreted as falsy value and
         * will disable query (which is undesirable).
         */
        request !== false;

      return useInfiniteQuery({
        ...queryOptions,
        ...queryOptionsOverrides,
        enabled: isQueryEnabled,
        queryKey: queryKeyFn(...queryKeyArgs).queryKey,
        queryFn(requestConfig) {
          const request = configRequest(queryKeyArgs, requestConfig.pageParam) ?? false;
          /** We cannot use `!request` here for the same reason as above */
          if (request === false) return;
          const contextWithoutPageParam = {
            ...requestConfig,
            pageParam: undefined,
          };
          delete contextWithoutPageParam.pageParam;
          return options.queryFn(request, contextWithoutPageParam);
        },
        getNextPageParam,
        getPreviousPageParam,
      });
    };
  };
};

if (import.meta.vitest) {
  const { test, expect, vi, describe } = import.meta.vitest;
  const { renderHook, waitFor } = await import('@testing-library/react');
  const { assertType } = await import('vitest');
  const { wrapper } = await import('./vitest');
  const { createQueryKeys } = await import('./createQueryKeys');

  type Config = ReturnType<typeof requestConfig>;
  const requestConfig = (_: unknown, pageParam: unknown) => ({
    url: 'url',
    pageParam,
  });

  type QueryReturn = Config | string | number;

  const keys = createQueryKeys('test', (key) => ({
    static: key.infinite<QueryReturn>(),
    dynamic: key.infinite.dynamic<QueryReturn, [test: string]>(),
    dynamicOptional: key.infinite.dynamic<QueryReturn, [test?: string]>(),
    simple: key.infinite<number>(),
  }));

  const queryFnSpy = vi.fn((config: QueryReturn) => config);

  const createInfiniteQuery = createInfiniteQueryFactory({
    queryFn: queryFnSpy,
  });

  describe('basic functionality', async () => {
    const useTest = createInfiniteQuery(keys.static, {
      request: requestConfig,
    });

    test('correct data', async () => {
      const { result } = renderHook(() => useTest(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      assertType<InfiniteData<QueryReturn> | undefined>(result.current.data);
      expect(result.current.data).toStrictEqual({
        pageParams: [undefined],
        pages: [requestConfig([], undefined)],
      });
    });

    test('correct error', async () => {
      const error = new Error('test');
      queryFnSpy.mockImplementationOnce(() => {
        throw error;
      });

      const { result } = renderHook(() => useTest(), { wrapper });
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBe(error);
    });
  });

  describe('enabled', () => {
    test('useOptions.enabled is false', () => {
      const useTest = createInfiniteQuery(keys.static, {
        request: requestConfig,
        useOptions: () => ({
          enabled: false,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: true }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('request is falsy', () => {
      const useTest = createInfiniteQuery(keys.static, {
        request: () => null,
        useOptions: () => ({
          enabled: true,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: true }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('queryOpts.enabled is false', () => {
      const useTest = createInfiniteQuery(keys.static, {
        request: requestConfig,
        useOptions: () => ({
          enabled: true,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: false }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  describe('dynamic queries', () => {
    test('should be able to pass queryKey arguments', async () => {
      const useOptionsSpy = vi.fn();
      const useTest = createInfiniteQuery(keys.dynamic, {
        request: ([testArg]) => testArg,
        useOptions: useOptionsSpy,
      });

      const { result } = renderHook(() => useTest({ args: ['test'] }), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(queryFnSpy.mock.lastCall?.[0]).toBe('test');
      expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual(['test']);
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if query is "static"', async () => {
      const requestSpy = vi.fn(requestConfig);
      const useOptionsSpy = vi.fn<[[]]>();
      const useTest = createInfiniteQuery(keys.static, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[], undefined]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[], undefined]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if they are optional', async () => {
      const requestSpy = vi.fn((args: [string?], pageParam?: unknown) => 1);
      const useOptionsSpy = vi.fn<[[test?: string]]>();
      const useTest = createInfiniteQuery(keys.dynamicOptional, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({ args: [] }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[], undefined]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[], undefined]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[], undefined]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should NOT be able to omit `queryOpts` and/or `queryKey` args if they are required', () => {
      const useTest = createInfiniteQuery(keys.dynamic, {
        request: requestConfig,
      });

      // @ts-expect-error
      renderHook(() => useTest(), { wrapper });
      // @ts-expect-error
      renderHook(() => useTest({}), { wrapper });
      // @ts-expect-error
      renderHook(() => useTest({ args: [] }), { wrapper });
    });
  });

  describe('context', () => {
    test('should be able to pass context', async () => {
      const useOptionsSpy = vi.fn<[queryArgs: [test: string], ctx: string]>();
      const useTest = createInfiniteQuery(keys.dynamic, {
        request: requestConfig,
        useOptions: useOptionsSpy,
      });

      const { result } = renderHook(() => useTest({ args: ['test'], ctx: 'ctx-test' }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(useOptionsSpy.mock.lastCall).toStrictEqual([['test'], 'ctx-test']);
    });

    test('should be able to omit `ctx` if it is optional', async () => {
      const useOptionsSpy = vi.fn<[queryArgs: [test: string], ctx?: string]>();
      const useTest = createInfiniteQuery(keys.dynamic, {
        request: requestConfig,
        useOptions: useOptionsSpy,
      });

      const { result } = renderHook(() => useTest({ args: ['test'] }), {
        wrapper,
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(useOptionsSpy.mock.lastCall).toStrictEqual([['test'], undefined]);
    });

    test('should NOT be able to omit query argument or `ctx` if `ctx` is required', () => {
      const useOptionsSpy = vi.fn<[queryArgs: [], ctx: string]>();
      const useTest = createInfiniteQuery(keys.static, {
        request: requestConfig,
        useOptions: useOptionsSpy,
      });

      // @ts-expect-error
      renderHook(() => useTest({}), { wrapper });
      // @ts-expect-error
      renderHook(() => useTest(), { wrapper });
    });
  });

  describe('typing', () => {
    test('`refetchInterval` should NOT affect type of `data`', () => {
      const useTest = createInfiniteQuery(keys.simple, {
        request: requestConfig,
        useOptions: {
          // @ts-expect-error
          refetchInterval: (data?: string) => false,
        },
      });

      const { result } = renderHook(() => useTest(), { wrapper });

      assertType<InfiniteData<number> | undefined>(result.current.data);
    });

    test('`refetchInterval` override should NOT affect type of `data`', () => {
      const useTest = createInfiniteQuery(keys.simple, {
        request: requestConfig,
        useOptions: {
          // @ts-expect-error
          refetchInterval: (data?: string) => false,
        },
      });

      const { result } = renderHook(
        () =>
          useTest({
            // @ts-expect-error
            refetchInterval: (data?: string) => false,
          }),
        { wrapper },
      );

      assertType<InfiniteData<number> | undefined>(result.current.data);
    });

    test('`select` should affect type of `data`', () => {
      const useTest = createInfiniteQuery(keys.simple, {
        request: requestConfig,
        useOptions: {
          select: () => true as const,
          // @ts-expect-error
          refetchInterval: (data?: string) => false,
        },
      });

      const { result } = renderHook(() => useTest(), { wrapper });

      assertType<true | undefined>(result.current.data);
    });

    // test('`select` override should affect type of `data`', () => {
    //   const useTest = createInfiniteQuery(keys.simple, {
    //     request: requestConfig,
    //     useOptions: {
    //       select: () => true as const,
    //       // @ts-expect-error
    //       refetchInterval: (data?: string) => false,
    //     },
    //   });

    //   const { result } = renderHook(
    //     () =>
    //       useTest({
    //         select: () => false as const,
    //         // @ts-expect-error
    //         refetchInterval: (data?: string) => false,
    //       }),
    //     { wrapper },
    //   );

    //   assertType<false | undefined>(result.current.data);
    // });
  });
}
