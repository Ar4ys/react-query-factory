import {
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult,
} from '@tanstack/react-query';

type UseMutationOptions<TData = unknown, TError = unknown, TVariables = void> = Omit<
  TanstackUseMutationOptions<TData, TError, TVariables>,
  'mutationFn' | 'mutationKey'
>;

type MutationConfig<TConfig, TData = unknown, TError = unknown, TVariables = void> = {
  request: TConfig | ((data: TVariables) => TConfig);
  useOptions?:
    | UseMutationOptions<TData, TError, TVariables>
    | ((data: TVariables) => UseMutationOptions<TData, TError, TVariables>);
};

type UseMutationHook<TResponse, TError, TInput> = (
  queryOpts?: UseMutationOptions<TResponse, TError, TInput>,
) => UseMutationResult<TResponse, TError, TInput>;

export type CreateMutation<TConfig> = <TResponse, TInput, TError = unknown>(
  config: MutationConfig<TConfig, TResponse, TError, TInput>,
) => UseMutationHook<TResponse, TError, TInput>;
