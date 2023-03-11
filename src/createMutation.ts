import {
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';

type UseMutationOptions<TData = unknown, TError = unknown, TVariables = void> = Omit<
  TanstackUseMutationOptions<TData, TError, TVariables>,
  'mutationFn' | 'mutationKey'
>;

type MutationRequestConfig<
  TConfig,
  TData = unknown,
  TError = unknown,
  TVariables = void,
> = UseMutationOptions<TData, TError, TVariables> & {
  request: TConfig | ((data: TVariables) => TConfig);
};

type UseMutationHook<TResponse, TError, TInput> = (
  queryOpts?: UseMutationOptions<TResponse, TError, TInput>,
) => UseMutationResult<TResponse, TError, TInput>;

export type CreateMutation<TConfig> = <TResponse, TInput, TError = unknown>(
  requestConfig:
    | MutationRequestConfig<TConfig, TResponse, TError, TInput>
    | (() => MutationRequestConfig<TConfig, TResponse, TError, TInput>),
) => UseMutationHook<TResponse, TError, TInput>;
