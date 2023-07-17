import {
  Query,
  UseQueryOptions as TanstackUseQueryOptions,
  UseQueryResult,
  useQuery,
} from '@tanstack/react-query';

import type { AnyNonDefKey, GetKeyMeta, GetKeyValue } from './createQueryKeys';
import type { QueryFunction } from './createReactQueryFactories';
import { NoInfer, PickRequired, QueryArgs, QueryContext } from './utils';

type QueryOptions<
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
> = Omit<
  TanstackUseQueryOptions<
    GetKeyMeta<TKey>['TData'],
    TError,
    /**
     * Only `select` can change `TData` type, but `TData` is also used in other fields (`onSuccess`,
     * `onSettled`, etc.). As a result in the situation below `data` (above `?^`) will be `any`,
     * because it is specified as `any` in `onSuccess`. In order to prevent this `select` is the
     * only field that directly access `TData` (so type inference works), other fields that should
     * not be able to change `TData` can only access `NoInfer<TData>` (so type inference won't
     * work)
     *
     * ```ts
     * const useTest = createQuery(key, {
     *   request,
     *   useOptions: () => ({
     *     select: (data): number => data.num,
     *     onSuccess: (data: any) => {},
     *   }),
     * });
     *
     * const { data } = useTest();
     * //      ?^
     * ```
     */
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

type UseQueryOptions<
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TContext = undefined,
  // TODO: Add support for select override
> = Omit<QueryOptions<TKey, TError, TData>, 'select'> &
  QueryContext<TContext> &
  QueryArgs<GetKeyMeta<TKey>['TArgs']>;

type QueryConfig<
  TConfig,
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TContext = undefined,
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
  request: ((args: GetKeyMeta<TKey>['TArgs']) => TConfig | undefined | null | false) | TConfig;

  useOptions?:
    | QueryOptions<TKey, TError, TData>
    | ((args: GetKeyMeta<TKey>['TArgs'], context: TContext) => QueryOptions<TKey, TError, TData>);
};

type UseQueryHookParams<TKey extends AnyNonDefKey, TError, TData, TContext> = keyof PickRequired<
  UseQueryOptions<TKey, TError, TData, TContext>
> extends never
  ? [queryOpts?: UseQueryOptions<TKey, TError, TData, TContext>]
  : [queryOpts: UseQueryOptions<TKey, TError, TData, TContext>];

type UseQueryHook<TKey extends AnyNonDefKey, TError, TData, TContext> = <TTData = TData>(
  ...args: UseQueryHookParams<TKey, TError, TTData, TContext>
) => UseQueryResult<TTData, TError>;

export type CreateQuery<TConfig> = <
  TKey extends AnyNonDefKey,
  TError = unknown,
  TData = GetKeyMeta<TKey>['TData'],
  TContext = undefined,
>(
  queryKey: TKey,
  config: QueryConfig<TConfig, TKey, TError, TData, TContext>,
) => UseQueryHook<TKey, TError, TData, TContext>;

type CreateQueryFactoryOptions<TConfig> = {
  queryFn: QueryFunction<TConfig>;
};

// TODO: Query helpers
// TODO: Documentation
export function createQueryFactory<TConfig>(
  options: CreateQueryFactoryOptions<TConfig>,
): CreateQuery<TConfig> {
  return (
    queryKey: AnyNonDefKey,
    {
      request: configRequest,
      useOptions: configUseOptions,
    }: QueryConfig<TConfig, any, any, any, any>,
  ): UseQueryHook<any, any, any, any> => {
    return (
      {
        args: queryKeyArgs = [],
        ctx: queryContext,
        ...queryOptionsOverrides
      }: UseQueryOptions<any> = {} as any,
    ) => {
      const useOptions =
        typeof configUseOptions === 'function' ? configUseOptions : () => configUseOptions;
      const queryKeyFn = typeof queryKey === 'function' ? queryKey : () => queryKey;
      const queryOptions = useOptions?.(queryKeyArgs, queryContext);
      const request =
        configRequest instanceof Function ? configRequest(queryKeyArgs) ?? false : configRequest;

      const isQueryEnabled =
        (queryOptions?.enabled ?? true) &&
        (queryOptionsOverrides?.enabled ?? true) &&
        /**
         * We cannot use `Boolean(request)` here, because user can specify string or number as a
         * `TConfig`, in which case empty string and zero will be misinterpreted as falsy value and
         * will disable query (which is undesirable).
         */
        request !== false;

      return useQuery({
        ...queryOptions,
        ...queryOptionsOverrides,
        enabled: isQueryEnabled,
        queryKey: queryKeyFn(queryKeyArgs).queryKey,
        queryFn(requestConfig) {
          /** We cannot use `!request` here for the same reason as above */
          if (request === false) return;
          const contextWithoutPageParam = {
            ...requestConfig,
            pageParam: undefined,
          };
          delete contextWithoutPageParam.pageParam;
          return options.queryFn(request, contextWithoutPageParam);
        },
      });
    };
  };
}

if (import.meta.vitest) {
  const { test, expect, vi, describe } = import.meta.vitest;
  const { renderHook, waitFor } = await import('@testing-library/react');
  const { assertType } = await import('vitest');
  const { wrapper } = await import('./vitest');
  const { createQueryKeys } = await import('./createQueryKeys');

  type Config = typeof requestConfig;
  const requestConfig = {
    url: 'url',
  };

  type QueryReturn = Config | string | number;

  const keys = createQueryKeys('test', (key) => ({
    static: key<QueryReturn>(),
    dynamic: key.dynamic<QueryReturn, [test: string]>(),
    dynamicOptional: key.dynamic<QueryReturn, [test?: string]>(),
    simple: key<number>(),
  }));

  const queryFnSpy = vi.fn((config: QueryReturn) => config);

  const createQuery = createQueryFactory({
    queryFn: queryFnSpy,
  });

  describe('basic functionality', () => {
    const useTest = createQuery(keys.static, {
      request: requestConfig,
    });

    test('correct data', async () => {
      const { result } = renderHook(() => useTest(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      assertType<QueryReturn | undefined>(result.current.data);
      expect(result.current.data).toBe(requestConfig);
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
      const useTest = createQuery(keys.static, {
        request: requestConfig,
        useOptions: () => ({
          enabled: false,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: true }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('request is falsy', () => {
      const useTest = createQuery(keys.static, {
        request: () => null,
        useOptions: () => ({
          enabled: true,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: true }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('queryOpts.enabled is false', () => {
      const useTest = createQuery(keys.static, {
        request: requestConfig,
        useOptions: () => ({
          enabled: true,
        }),
      });

      const { result } = renderHook(() => useTest({ enabled: false }), { wrapper });
      expect(result.current.fetchStatus).toBe('idle');
    });

    test('request as an empty string should not set "enabled: false"', () => {
      const useTest = createQuery(keys.static, {
        request: '',
      });

      const { result } = renderHook(() => useTest(), { wrapper });
      expect(result.current.fetchStatus).not.toBe('idle');
    });

    test('request as a zero should not set "enabled: false"', () => {
      const useTest = createQuery(keys.static, {
        request: 0,
      });

      const { result } = renderHook(() => useTest(), { wrapper });
      expect(result.current.fetchStatus).not.toBe('idle');
    });
  });

  describe('dynamic queries', () => {
    test('should be able to pass queryKey arguments', async () => {
      const useOptionsSpy = vi.fn();
      const useTest = createQuery(keys.dynamic, {
        request: ([id]) => id,
        // @ts-expect-error
        onError(error, query: Query) {
          query.queryKey[2][0];
          query.meta.args[0];
        },
        useOptions: useOptionsSpy,
      });

      const { result } = renderHook(() => useTest({ args: ['test'] }), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(queryFnSpy.mock.lastCall?.[0]).toBe('test');
      expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual(['test']);
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if query is "static"', async () => {
      const requestSpy = vi.fn(() => 1);
      const useOptionsSpy = vi.fn<[[]]>();
      const useTest = createQuery(keys.static, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[]]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[]]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should be able to omit `queryOpts` and/or `queryKey` args if they are optional', async () => {
      const requestSpy = vi.fn(([test]: [string?]) => 1);
      const useOptionsSpy = vi.fn<[[test?: string]]>();
      const useTest = createQuery(keys.dynamicOptional, {
        request: requestSpy,
        useOptions: useOptionsSpy,
      });

      {
        const { result } = renderHook(() => useTest({ args: [] }), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[]]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest({}), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[]]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
      {
        const { result } = renderHook(() => useTest(), { wrapper });
        await waitFor(() => expect(result.current.isSuccess).toBe(true));
        expect(requestSpy.mock.lastCall).toStrictEqual([[]]);
        expect(useOptionsSpy.mock.lastCall?.[0]).toStrictEqual([]);
      }
    });

    test('should NOT be able to omit `queryOpts` and/or `queryKey` args if they are required', () => {
      const useTest = createQuery(keys.dynamic, {
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
      const useTest = createQuery(keys.dynamic, {
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
      const useTest = createQuery(keys.dynamic, {
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
      const useTest = createQuery(keys.static, {
        request: requestConfig,
        useOptions: useOptionsSpy,
      });

      // @ts-expect-error
      renderHook(() => useTest({}), { wrapper });
      // @ts-expect-error
      renderHook(() => useTest(), { wrapper });
    });
  });

  // describe('select', () => {
  //   test('`select` override should not affect members inside query declaration', async () => {
  //     const onSuccessSpy = vi.fn<[data: number]>();
  //     const onSuccessOverrideSpy = vi.fn<[data: string]>();
  //     const useTest = createQuery(keys.static, {
  //       request: requestConfig,
  //       useOptions: {
  //         select: () => 1,
  //         onSuccess: onSuccessSpy,
  //       },
  //     });

  //     const { result } = renderHook(
  //       () =>
  //         useTest({
  //           select: () => '2',
  //           onSuccess: onSuccessOverrideSpy,
  //         }),
  //       {
  //         wrapper,
  //       },
  //     );
  //     await waitFor(() => expect(result.current.data).toBe('2'));
  //     expect(onSuccessSpy.mock.lastCall).toStrictEqual([1]);
  //     expect(onSuccessOverrideSpy.mock.lastCall).toStrictEqual(['2']);
  //   });
  // });

  describe('typing', () => {
    test('`refetchInterval` should NOT affect type of `data`', () => {
      const useTest = createQuery(keys.simple, {
        request: requestConfig,
        useOptions: {
          // @ts-expect-error
          refetchInterval: (data?: string) => false,
        },
      });

      const { result } = renderHook(() => useTest(), { wrapper });

      assertType<number | undefined>(result.current.data);
    });

    test('`refetchInterval` override should NOT affect type of `data`', () => {
      const useTest = createQuery(keys.simple, {
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

      assertType<number | undefined>(result.current.data);
    });

    test('`select` should affect type of `data`', () => {
      const useTest = createQuery(keys.simple, {
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
    //   const useTest = createQuery(keys.simple, {
    //     request: requestConfig,
    //     useOptions: {
    //       select: (data) => true as const,
    //       onError(error: unknown) {},
    //       // @ts-expect-error
    //       onSettled(data?: string) {},
    //       // @ts-expect-error
    //       onSuccess(data: string) {},
    //     },
    //   });

    //   const { result } = renderHook(
    //     () =>
    //       useTest({
    //         select: () => false as const,
    //         onError(error: unknown) {},
    //         // @ts-expect-error
    //         onSettled(data?: string) {},
    //         // @ts-expect-error
    //         onSuccess(data: string) {},
    //       }),
    //     { wrapper },
    //   );

    //   assertType<false | undefined>(result.current.data);
    // });
  });
}
