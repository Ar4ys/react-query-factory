import { InfiniteData, useInfiniteQuery } from '@tanstack/react-query';

import type { GetKeyMeta, GetKeyValue, KeyConstraint } from './createQueryKeys';
import type { QueryFunction } from './createReactQueryFactories';
import type {
  UseInfiniteQueryOptions as TanstackUseInfiniteQueryOptions,
  UseInfiniteQueryResult,
} from './tanstack-fixes';
import { NoInfer, PickRequired, QueryArgs, QueryContext } from './utils';

// TODO: rename
type GetInfiniteDataType<T extends InfiniteData<any>> = T['pages'][number];

type GetPreviousPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  firstPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type GetNextPageParamFunction<TQueryFnData = unknown, TPageParam = unknown> = (
  lastPage: TQueryFnData,
  allPages: TQueryFnData[],
) => TPageParam;

type InfiniteQueryOptions<
  TKey extends KeyConstraint,
  TError = unknown,
  TData = GetKeyMeta<TKey>['returnType'],
> = Omit<
  TanstackUseInfiniteQueryOptions<
    GetInfiniteDataType<GetKeyMeta<TKey>['returnType']>,
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
  select?: (data: GetKeyMeta<TKey>['returnType']) => TData;
};

type UseInfiniteQueryOptions<
  TKey extends KeyConstraint,
  TError = unknown,
  TData = GetKeyMeta<TKey>['returnType'],
  TContext = undefined,
  // TODO: Add support for select override
> = Omit<InfiniteQueryOptions<TKey, TError, TData>, 'select'> &
  QueryContext<TContext> &
  QueryArgs<GetKeyMeta<TKey>['fnArgs']>;

type InfiniteQueryConfig<
  TConfig,
  TKey extends KeyConstraint,
  TError = unknown,
  TData = GetKeyMeta<TKey>['returnType'],
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
   *
   * TODO: Should we replace this function in function pattern with `(args, pageParam) => TConfig`?
   *
   * That way there will be no need for nested functions (which is easier to use) and `request` will
   * be similar to `useOptions` (`args` is an array that needs to be destructed). If this is
   * `approved` - the same needs to be done in `QueryConfig`
   */
  request: (
    ...args: GetKeyMeta<TKey>['fnArgs']
  ) => ((pageParam: TPageParam | undefined) => TConfig) | undefined | null | false;

  useOptions?:
    | InfiniteQueryOptions<TKey, TError, TData>
    | ((
        args: GetKeyMeta<TKey>['fnArgs'],
        context: TContext,
      ) => InfiniteQueryOptions<TKey, TError, TData>);

  /**
   * This function can be set to automatically get the previous cursor for infinite queries. The
   * result will also be used to determine the value of `hasPreviousPage`.
   */
  getPreviousPageParam?: GetPreviousPageParamFunction<
    GetInfiniteDataType<GetKeyMeta<TKey>['returnType']>,
    TPageParam
  >;

  /**
   * This function can be set to automatically get the next cursor for infinite queries. The result
   * will also be used to determine the value of `hasNextPage`.
   */
  getNextPageParam?: GetNextPageParamFunction<
    GetInfiniteDataType<GetKeyMeta<TKey>['returnType']>,
    TPageParam
  >;
};

type UseInfiniteQueryHookParams<
  TKey extends KeyConstraint,
  TError,
  TData,
  TContext,
> = keyof PickRequired<UseInfiniteQueryOptions<TKey, TError, TData, TContext>> extends never
  ? [queryOpts?: UseInfiniteQueryOptions<TKey, TError, TData, TContext>]
  : [queryOpts: UseInfiniteQueryOptions<TKey, TError, TData, TContext>];

type UseInfiniteQueryHook<TKey extends KeyConstraint, TError, TData, TContext> = <TTData = TData>(
  ...args: UseInfiniteQueryHookParams<TKey, TError, TTData, TContext>
) => UseInfiniteQueryResult<TTData, TError>;

export type CreateInfiniteQuery<TConfig> = <
  TKey extends KeyConstraint,
  TError = unknown,
  TData = GetKeyMeta<TKey>['returnType'],
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
    queryKey: KeyConstraint,
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
      const request = configRequest(...queryKeyArgs);

      const isQueryEnabled =
        (queryOptions?.enabled ?? true) &&
        (queryOptionsOverrides?.enabled ?? true) &&
        /**
         * We cannot use `Boolean(request)` here, because user can specify string or number as a
         * `TConfig`, in which case empty string and zero will be misinterpreted as falsy value and
         * will disable query (which is undesirable).
         */
        (request ?? false) !== false;

      return useInfiniteQuery({
        ...queryOptions,
        ...queryOptionsOverrides,
        enabled: isQueryEnabled,
        queryKey: queryKeyFn(...queryKeyArgs).queryKey,
        queryFn(requestConfig) {
          if (!request) return;
          const contextWithoutPageParam = {
            ...requestConfig,
            pageParam: undefined,
          };
          delete contextWithoutPageParam.pageParam;
          return options.queryFn(request(requestConfig.pageParam), contextWithoutPageParam);
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
  const requestConfig = (pageParam: unknown) => ({
    url: 'url',
    pageParam,
  });

  const keys = createQueryKeys('test', (key) => ({
    static: key.infinite<Config | string | number>(),
    dynamic: key.infinite.dynamic<Config | string | number, [test: string]>(),
    dynamicOptional: key.infinite.dynamic<Config | string | number, [test?: string]>(),
    simple: key.infinite<number>(),
  }));

  const queryFnSpy = vi.fn((config: Config | string | number) => config);

  const createInfiniteQuery = createInfiniteQueryFactory({
    queryFn: queryFnSpy,
  });

  describe('basic functionality', async () => {
    const useTest = createInfiniteQuery(keys.static, {
      request: () => requestConfig,
    });

    test('onSuccess and onSettled', async () => {
      const { result } = renderHook(() => useTest(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toStrictEqual({
        pageParams: [undefined],
        pages: [requestConfig(undefined)],
      });
    });

    test('onError and onSettled', async () => {
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
        request: () => requestConfig,
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
        request: () => requestConfig,
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
        request: (testArg) => () => testArg,
        useOptions: useOptionsSpy,
      });

      const { result } = renderHook(() => useTest({ args: ['test'] }), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(queryFnSpy.mock.lastCall?.[0]).toBe('test');
      expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual(['test']);
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if query is "static"', async () => {
      const requestSpy = vi.fn(() => requestConfig);
      const useOptionsSpy = vi.fn<[[]]>();
      const useTest = createInfiniteQuery(keys.static, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if they are optional', async () => {
      const requestSpy = vi.fn((test?: string) => () => 1);
      const useOptionsSpy = vi.fn<[[test?: string]]>();
      const useTest = createInfiniteQuery(keys.dynamicOptional, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({ args: [] }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should NOT be able to omit `queryOpts` and/or `queryKey` args if they are required', () => {
      const useTest = createInfiniteQuery(keys.dynamic, {
        request: () => requestConfig,
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
        request: () => requestConfig,
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
        request: () => requestConfig,
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
        request: () => requestConfig,
        useOptions: useOptionsSpy,
      });

      // @ts-expect-error
      renderHook(() => useTest({}), { wrapper });
      // @ts-expect-error
      renderHook(() => useTest(), { wrapper });
    });
  });

  describe('typing', () => {
    test('`onSuccess`, `onSettled` and others should NOT affect type of `data`', () => {
      const useTest = createInfiniteQuery(keys.simple, {
        request: () => requestConfig,
        useOptions: {
          // @ts-expect-error
          refetchInterval: (data?: string) => false,
        },
      });

      const { result } = renderHook(() => useTest(), { wrapper });

      assertType<InfiniteData<number> | undefined>(result.current.data);
    });

    test('`onSuccess`, `onSettled` and others overrides should NOT affect type of `data`', () => {
      const useTest = createInfiniteQuery(keys.simple, {
        request: () => requestConfig,
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
        request: () => requestConfig,
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
    //     request: () => requestConfig,
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
