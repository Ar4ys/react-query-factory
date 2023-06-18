import {
  UseMutationOptions as TanstackUseMutationOptions,
  UseMutationResult,
  useMutation,
} from '@tanstack/react-query';

import type { MutationFunction } from './createReactQueryFactories';

type UseMutationOptions<TData = unknown, TError = unknown, TVariables = unknown> = Omit<
  TanstackUseMutationOptions<TData, TError, TVariables>,
  'mutationFn'
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

// TODO: Mutation helpers (what "mutation helpers" can be?)
// TODO: Documentation
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

if (import.meta.vitest) {
  const { test, expect, vi, describe } = import.meta.vitest;
  const { renderHook, waitFor } = await import('@testing-library/react');
  const { wrapper } = await import('./vitest');

  type Config = typeof requestConfig;
  const requestConfig = {
    url: 'url',
  };

  const mutationFnSpy = vi.fn((config: Config | string | number) => config);

  const createMutation = createMutationFactory({
    mutationFn: mutationFnSpy,
  });

  describe('callbacks', async () => {
    const onMutateSpy = vi.fn();
    const onMutateOverloadSpy = vi.fn();
    const onSuccessSpy = vi.fn();
    const onSuccessOverloadSpy = vi.fn();
    const onErrorSpy = vi.fn();
    const onErrorOverloadSpy = vi.fn();
    const onSettledSpy = vi.fn();
    const onSettledOverloadSpy = vi.fn();

    const useTest = createMutation({
      request: requestConfig,
      useOptions: () => ({
        onMutate: onMutateSpy,
        onSuccess: onSuccessSpy,
        onError: onErrorSpy,
        onSettled: onSettledSpy,
      }),
    });

    test('onMutation, onSuccess and onSettled', async () => {
      const { result } = renderHook(
        () =>
          useTest({
            onMutate: onMutateOverloadSpy,
            onSuccess: onSuccessOverloadSpy,
            onError: onErrorOverloadSpy,
            onSettled: onSettledOverloadSpy,
          }),
        { wrapper },
      );

      result.current.mutate(requestConfig);
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toBe(requestConfig);
      expect(onMutateSpy).toBeCalled();
      expect(onMutateOverloadSpy).toBeCalled();
      expect(onSuccessSpy).toBeCalled();
      expect(onSuccessOverloadSpy).toBeCalled();
      expect(onErrorSpy).not.toBeCalled();
      expect(onErrorOverloadSpy).not.toBeCalled();
      expect(onSettledSpy).toBeCalled();
      expect(onSettledOverloadSpy).toBeCalled();
    });

    test('onMutation, onError and onSettled', async () => {
      mutationFnSpy.mockImplementationOnce(() => {
        throw 'error';
      });

      const { result } = renderHook(
        () =>
          useTest({
            onMutate: onMutateOverloadSpy,
            onSuccess: onSuccessOverloadSpy,
            onError: onErrorOverloadSpy,
            onSettled: onSettledOverloadSpy,
          }),
        { wrapper },
      );

      result.current.mutate(requestConfig);
      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBe('error');
      expect(onMutateSpy).toBeCalled();
      expect(onMutateOverloadSpy).toBeCalled();
      expect(onSuccessSpy).not.toBeCalled();
      expect(onSuccessOverloadSpy).not.toBeCalled();
      expect(onErrorSpy).toBeCalled();
      expect(onErrorOverloadSpy).toBeCalled();
      expect(onSettledSpy).toBeCalled();
      expect(onSettledOverloadSpy).toBeCalled();
    });
  });
}
