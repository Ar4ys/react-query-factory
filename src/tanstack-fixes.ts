import type {
  ContextOptions,
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  InfiniteData,
  QueryKey,
  QueryObserverBaseResult,
  QueryObserverOptions,
} from '@tanstack/react-query';

/**
 * We are forced to copy `UseInfiniteQueryOptions` and `InfiniteQueryObserverResult` declarations
 * here (instead of directly using it), because this is the only way to fix `TData` bug (`select`
 * breaks because `TData` must be `InfiniteData` and you cannot change it).
 *
 * It is (probably) fixed in react-query v5-alpha
 */
// TODO: Remove support for `onSuccess`, `onError` and `onSettled` as they are deprecated
// and will be removed in react-query@5
export type UseInfiniteQueryOptions<
  TQueryFnData = unknown,
  TError = unknown,
  TData = InfiniteData<TQueryFnData>,
  TQueryKey extends QueryKey = QueryKey,
> = ContextOptions &
  QueryObserverOptions<TQueryFnData, TError, TData, InfiniteData<TQueryFnData>, TQueryKey>;

interface InfiniteQueryObserverBaseResult<TData = unknown, TError = unknown>
  extends QueryObserverBaseResult<TData, TError> {
  fetchNextPage: (
    options?: FetchNextPageOptions,
  ) => Promise<InfiniteQueryObserverResult<TData, TError>>;
  fetchPreviousPage: (
    options?: FetchPreviousPageOptions,
  ) => Promise<InfiniteQueryObserverResult<TData, TError>>;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
}

interface InfiniteQueryObserverLoadingResult<TData = unknown, TError = unknown>
  extends InfiniteQueryObserverBaseResult<TData, TError> {
  data: undefined;
  error: null;
  isError: false;
  isLoading: true;
  isLoadingError: false;
  isRefetchError: false;
  isSuccess: false;
  status: 'loading';
}

interface InfiniteQueryObserverLoadingErrorResult<TData = unknown, TError = unknown>
  extends InfiniteQueryObserverBaseResult<TData, TError> {
  data: undefined;
  error: TError;
  isError: true;
  isLoading: false;
  isLoadingError: true;
  isRefetchError: false;
  isSuccess: false;
  status: 'error';
}

interface InfiniteQueryObserverRefetchErrorResult<TData = unknown, TError = unknown>
  extends InfiniteQueryObserverBaseResult<TData, TError> {
  data: TData;
  error: TError;
  isError: true;
  isLoading: false;
  isLoadingError: false;
  isRefetchError: true;
  isSuccess: false;
  status: 'error';
}

interface InfiniteQueryObserverSuccessResult<TData = unknown, TError = unknown>
  extends InfiniteQueryObserverBaseResult<TData, TError> {
  data: TData;
  error: null;
  isError: false;
  isLoading: false;
  isLoadingError: false;
  isRefetchError: false;
  isSuccess: true;
  status: 'success';
}

type InfiniteQueryObserverResult<TData = unknown, TError = unknown> =
  | InfiniteQueryObserverLoadingErrorResult<TData, TError>
  | InfiniteQueryObserverLoadingResult<TData, TError>
  | InfiniteQueryObserverRefetchErrorResult<TData, TError>
  | InfiniteQueryObserverSuccessResult<TData, TError>;

export type UseInfiniteQueryResult<TData = unknown, TError = unknown> = InfiniteQueryObserverResult<
  TData,
  TError
>;
