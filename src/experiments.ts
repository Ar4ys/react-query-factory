import { useCallback, useState } from 'react';
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  useInfiniteQuery,
  useQueryClient,
  UseQueryOptions,
  UseQueryResult,
  QueryFilters,
  UseInfiniteQueryOptions,
  InfiniteData,
  QueryClient,
} from '@tanstack/react-query';
import { createQueryKeys } from '.';

type GetEventsReturn = {};
type EventsFetchMode = {};
type EventsFilterOptions = {};
type Review = {};

const eventsQueryKeys = createQueryKeys('events', k => ({
  fetchMode: k.infinite<GetEventsReturn>()((fetchMode: EventsFetchMode | undefined) => ({
    queryKey: [fetchMode],
    filter: k.infinite<GetEventsReturn>()((filter: EventsFilterOptions | undefined) => [filter]),
  })),
  all: k.infinite<GetEventsReturn>(),
  event: k<Event>()((eventId: string | undefined) => [eventId]),
  usersReviews: k<Review[]>()((eventId: string | undefined) => ['userReviews', eventId]),
  restaurantReview: k<Review>()((restaurantId: string | undefined) => [
    'restaurantReview',
    restaurantId,
  ]),
}));

// --------------------------------------------------

declare const queryClient: QueryClient;
queryClient.setQueryData(eventsQueryKeys.all, cache => {});

eventsQueryKeys.fetchMode('olo').filter('asd').queryKey;

eventsQueryKeys.all.queryKey;

const useGetSomething = createReactQuery(eventsQueryKeys.all)({ url: '/lol' });

queryClient.invalidateQueries(eventsQueryKeys.event._def);
useGetSomething.invalidate;
useGetSomething.getData;
useGetSomething.setData;
useGetSomething.fetch;
useGetSomething.refetch;
useGetSomething.prefetch();

{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DynamicQueryKeyFactory = (...args: any[]) => { queryKey: QueryKey };

  /**
   * All queries should be 'GET'. For mutations see {@link MutationRequestConfig}.
   */
  type QueryRequestConfig = Omit<AxiosRequestConfig<void>, 'method'>;

  type UseQueryHook<ResponseT> = (
    queryOpts?: UseQueryOptions<ResponseT, AxiosBaseError>
  ) => UseQueryResult<ResponseT, AxiosBaseError>;

  type UseQueryHookWithArgs<ResponseT, ArgsT> = (
    args: ArgsT,
    queryOpts?: UseQueryOptions<ResponseT, AxiosBaseError>
  ) => UseQueryResult<ResponseT, AxiosBaseError>;

  /**
   * React Query factory. This function has 2 overloads: for "static" and "dynamic" queries.
   *
   * - "Static" queries are ones that do not receive any arguments.
   * - "Dynamic" queries are ones that receive arguments.
   *   All arguments should be defined as part of the key.
   *
   * Usage of this function is quite convoluted because of TS limitation: TS stops inferring generics
   * if caller passes at least one generic. In that case caller is forced to pass all generics explicitly.
   * We, on the other hand, want user to pass only `ResponseT` explicitly, but infer `DynamicQueryKey`. The only
   * way to achieve this is to use "function currying" and split generics between multiple calls, so that
   * on the first call TS infers `DynamicQueryKey` and on the second user explicitly passes `ResponseT`.
   *
   * @example
   * const restaurantsQueryKeys = createQueryKeys('restaurants', {
   *   my: ['my'],
   *   single: (id: string) => [id]
   * });
   *
   * // "Static" query
   * const useGetMyRestaurantQuery = createReactQuery(
   *   restaurantsQueryKeys.my.queryKey
   * )<ServerFullRestaurantResponseData | null>({
   *   url: `${restaurantsBaseLink}/my`
   * });
   *
   * useGetMyRestaurantQuery({ onSuccess: () => doSomething() })
   *
   * // "Dynamic" query
   * const useGetRestaurantByIdQuery = createReactQuery(
   *   restaurantsQueryKeys.single
   * )<ServerFullRestaurantResponseData>((id) => ({
   *   url: `${restaurantsBaseLink}/${id}`
   * }));
   *
   * useGetRestaurantByIdQuery(['example_uuid'], { onSuccess: () => doSomething() })
   */
  export function createReactQuery(
    queryKey: QueryKey
  ): <ResponseT>(
    requestConfig: QueryRequestConfig | (() => QueryRequestConfig)
  ) => UseQueryHook<ResponseT>;

  export function createReactQuery<DynamicQueryKey extends DynamicQueryKeyFactory>(
    queryKey: DynamicQueryKey
  ): <ResponseT>(
    requestConfig:
      | QueryRequestConfig
      | ((...args: Parameters<DynamicQueryKey>) => QueryRequestConfig)
  ) => UseQueryHookWithArgs<ResponseT, Parameters<DynamicQueryKey>>;

  export function createReactQuery<ResponseT, DynamicQueryKey extends DynamicQueryKeyFactory>(
    queryKey: QueryKey | DynamicQueryKey
  ) {
    return (
      requestConfig:
        | QueryRequestConfig
        | ((...queryArgs: Parameters<DynamicQueryKey>) => QueryRequestConfig)
    ) => {
      const queryKeyFn = typeof queryKey === 'function' ? queryKey : () => ({ queryKey });
      const requestConfigFn =
        typeof requestConfig === 'function' ? requestConfig : () => requestConfig;

      return (
        ...args:
          | [
              queryArgs: Parameters<DynamicQueryKey>,
              queryOpts?: UseQueryOptions<ResponseT, AxiosBaseError>
            ]
          | [queryOpts?: UseQueryOptions<ResponseT, AxiosBaseError>]
      ) => {
        const queryOpts = Array.isArray(args[0]) ? args[1] : args[0];
        const queryArgs = Array.isArray(args[0])
          ? args[0]
          : ([] as unknown as Parameters<DynamicQueryKey>);

        return useQuery({
          ...queryOpts,
          queryKey: queryKeyFn(...queryArgs).queryKey,
          queryFn: async () => {
            const response = await axiosInstance<ResponseT>({
              method: 'GET',
              ...requestConfigFn(...queryArgs),
            });
            return response.data;
          },
        });
      };
    };
  }

  type InvalidateQueryKeys = 'all' | (QueryKey | QueryFilters)[];

  interface MutationRequestConfig<ResponseT, RequestDataT = unknown>
    extends Omit<AxiosRequestConfig<RequestDataT>, 'method'> {
    /**
     * `GET` is not allowed in mutations, as it should be used in queries.
     * @default 'POST'
     */
    method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    /** For more info see {@link createReactQueryMutation} */
    invalidateKeys?: InvalidateQueryKeys | ((data: ResponseT) => InvalidateQueryKeys);
  }

  /**
   * React Query mutation fabric.
   *
   * @param requestConfig - Can be either an object (`MutationRequestConfig`) or function that returns it.
   *
   * Note: You cannot pass `data` to "static" config (i.e. when `requestConfig` is an object), as it will
   * override any data that is passed to `mutate` function. In most cases it is an undesired behaviour.
   * What you probably want is to modify data, which can be done by passing a function instead.
   *
   * @example
   * // Invalidate queries by key
   * const authQueryKeys = createQueryKeys('auth', {
   *   session: ['session']
   * });
   *
   * const useCheckConfirmEmailCodeMutation = createReactQueryMutation<'OK', ConfirmEmailData>({
   *   url: `${authBaseLink}/confirm-email/verify-code`,
   *   invalidateKeys: [authQueryKeys.session.queryKey]
   * });
   *
   * // Invalidate every query in the cache
   * const useLogoutMutation = createReactQueryMutation<'OK'>({
   *   url: `${authBaseLink}/logout`,
   *   invalidateKeys: 'all'
   * });
   *
   * // Dynamic invalidation
   * const restaurantsQueryKeys = createQueryKeys('restaurants', {
   *   my: ['my'],
   *   single: (id: string) => [id]
   * });
   *
   * // `requestConfig` can be a function, that receives variables passed to `mutate()`.
   * // `invalidateKeys` can also be a function, but it will receive data returned by `mutationFn`.
   * const useUpdateRestaurantMutation = createReactQueryMutation<
   *   ServerRestaurantResponseData,
   *   Partial<RestaurantFieldsValues>
   * >((variables) => ({
   *   method: 'PATCH'
   *   url: restaurantsBaseLink,
   *   invalidateKeys: (data) => [
   *     restaurantsQueryKeys.my._def,
   *     restaurantsQueryKeys.single(data.id).queryKey
   *   ]
   * }));
   *
   * // You can also modify data before sending it. In that case you should explicitly pass
   * // type for data after modifications (3rd generic).
   * const useUploadProfilePicture = createReactQueryMutation<'OK', FileDetailInfo, FormData>(
   *   (fileInfo) => {
   *     const data = new FormData();
   *     data.append('avatar', fileInfo);
   *     return {
   *       url: 'profile/upload',
   *       data
   *     };
   *   }
   * );
   */
  export function createReactQueryMutation<
    ResponseT,
    RequestDataT = void,
    RequestModifiedDataT = RequestDataT
  >(
    requestConfig:
      | Omit<MutationRequestConfig<ResponseT>, 'data'>
      | ((data: RequestDataT) => MutationRequestConfig<ResponseT, RequestModifiedDataT>)
  ) {
    const requestConfigFn =
      typeof requestConfig === 'function' ? requestConfig : () => requestConfig;
    return (queryOpts?: UseMutationOptions<ResponseT, AxiosBaseError, RequestDataT>) => {
      const queryClient = useQueryClient();
      return useMutation({
        ...queryOpts,
        mutationFn: async (data: RequestDataT) => {
          const response = await axiosInstance<ResponseT>({
            method: 'POST',
            data,
            ...requestConfigFn(data),
          });
          return response.data;
        },
        onSuccess: (data, variables, context) => {
          const { invalidateKeys = [] } = requestConfigFn(variables);
          const invalidateKeysArray =
            typeof invalidateKeys === 'function' ? invalidateKeys(data) : invalidateKeys;

          if (invalidateKeysArray === 'all') {
            queryClient.invalidateQueries();
          } else {
            for (const query of invalidateKeysArray) {
              // For some reason TS throws error if I don't check if `query` is an array...
              if (Array.isArray(query)) queryClient.invalidateQueries(query);
              else queryClient.invalidateQueries(query);
            }
          }

          queryOpts?.onSuccess?.(data, variables, context);
        },
      });
    };
  }

  type UseWithIsRefreshingInfiniteQueryOpts<ResponseT> = UseInfiniteQueryOptions<
    ResponseT,
    AxiosBaseError
  >;

  export const useWithIsRefreshingInfiniteQuery = <ResponseT>(
    opts: UseWithIsRefreshingInfiniteQueryOpts<ResponseT>
  ) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { refetch, ...infiniteQueryResult } = useInfiniteQuery({
      ...opts,
      onSettled: (...args) => {
        if (isRefreshing) setIsRefreshing(false);
        opts.onSettled?.(...args);
      },
    });

    const handleRefresh = useCallback(() => {
      setIsRefreshing(true);
      refetch();
    }, [refetch]);

    return {
      ...infiniteQueryResult,
      refetch: handleRefresh,
      isRefreshing,
    };
  };
}

declare function aa<T1, T2 extends (...args: any[]) => Tuple>(
  cb: T2
): T2 & { [KeyMetadataSymbol]?: T1 };

declare function aa2<T1>(): <T2 extends (...args: any[]) => Tuple>(
  cb: T2
) => T2 & { [KeyMetadataSymbol]?: T1 };

const a1 = aa<string>((a: string) => ['asdsa']);
const a2 = aa2<string>()((a: string) => ['asdsa']);
