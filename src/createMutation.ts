import { UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

// TODO: Replace with `MutationRequestConfig` (similarly to `QueryRequestConfig` and `InfiniteQueryRequestConfig`)
type WithMutationRequestConfig<T, TConfig> = T & { request: TConfig };

type UseMutationHook<TResponse, TRequest> = (
  queryOpts?: UseMutationOptions<TResponse, /* Error */ unknown, TRequest>,
) => UseMutationResult<TResponse, /* Error */ unknown, TRequest>;

export type CreateMutation<TConfig> = <TResponse, TRequest, TRequestModified = TRequest>(
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
