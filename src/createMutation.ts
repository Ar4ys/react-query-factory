import {
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult,
  useMutation,
} from '@tanstack/react-query';

import type { MutationFunction } from './createReactQueryFactories';

type UseMutationOptions<TData = unknown, TError = unknown, TVariables = unknown> = Omit<
  TanstackUseMutationOptions<TData, TError, TVariables>,
  'mutationFn' | 'mutationKey'
>;

type MutationConfig<TConfig, TData = unknown, TError = unknown, TVariables = unknown> = {
  request: TConfig | ((data: TVariables) => TConfig);
  useOptions?:
    | UseMutationOptions<TData, TError, TVariables>
    | (() => UseMutationOptions<TData, TError, TVariables>);
};

type UseMutationHook<TResponse, TError, TInput> = (
  mutationOpts?: UseMutationOptions<TResponse, TError, TInput>,
) => UseMutationResult<TResponse, TError, TInput>;

export type CreateMutation<TConfig> = <TResponse, TInput, TError = unknown>(
  config: MutationConfig<TConfig, TResponse, TError, TInput>,
) => UseMutationHook<TResponse, TError, TInput>;

type CreateMutationFactoryOptions<TConfig> = {
  mutationFn: MutationFunction<TConfig>;
};

export const createMutationFactory = <TConfig>(
  options: CreateMutationFactoryOptions<TConfig>,
): CreateMutation<TConfig> => {
  function createMutation({
    request: configRequest,
    useOptions: configUseOptions,
  }: MutationConfig<TConfig, any, any, any>): UseMutationHook<any, any, any> {
    return (mutationOptionsOverrides) => {
      const useOptions =
        typeof configUseOptions === 'function' ? configUseOptions : () => configUseOptions;

      const mutationOptions = useOptions?.();
      const requestFn = configRequest instanceof Function ? configRequest : () => configRequest;

      return useMutation<unknown, unknown, unknown>({
        ...mutationOptions,
        ...mutationOptionsOverrides,
        async mutationFn(data) {
          const request = requestFn(data);
          return options.mutationFn(request, data);
        },
        onMutate(...args) {
          mutationOptions?.onMutate?.(...args);
          mutationOptionsOverrides?.onMutate?.(...args);
        },
        onError(...args) {
          mutationOptions?.onError?.(...args);
          mutationOptionsOverrides?.onError?.(...args);
        },
        onSuccess(...args) {
          mutationOptions?.onSuccess?.(...args);
          mutationOptionsOverrides?.onSuccess?.(...args);
        },
        onSettled(...args) {
          mutationOptions?.onSettled?.(...args);
          mutationOptionsOverrides?.onSettled?.(...args);
        },
      });
    };
  }

  return createMutation;
};
