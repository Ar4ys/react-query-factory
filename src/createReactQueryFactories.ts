import type { QueryFunctionContext } from '@tanstack/react-query';

import { CreateInfiniteQuery, createInfiniteQueryFactory } from './createInfiniteQuery';
import { CreateMutation, createMutationFactory } from './createMutation';
import { CreateQuery, createQueryFactory } from './createQuery';
import { createQueryKeys } from './createQueryKeys';

// TODO: Pass Errors
type ReactQueryFactories<TQueryConfig, TMutationConfig> = {
  createQuery: CreateQuery<TQueryConfig>;
  createInfiniteQuery: CreateInfiniteQuery<TQueryConfig>;
  createMutation: CreateMutation<TMutationConfig>;
};

type BaseRequestConfig = RequestInit & {
  url: string | URL;
};

// TODO: Move `QueryFunction` and `MutationFunction` to separate files to avoid circular imports
export type QueryFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  context: Omit<QueryFunctionContext, 'pageParam'>,
) => unknown | Promise<unknown>;

export type MutationFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  data: unknown,
) => unknown | Promise<unknown>;

type CreateReactQueryFactoriesOptions<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
> = {
  queryFn: QueryFunction<TQueryConfig>;
  mutationFn: MutationFunction<TMutationConfig>;
};

// TODO: Unit tests
// TODO: Documentation
export function createReactQueryFactories<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
>(
  options: CreateReactQueryFactoriesOptions<TQueryConfig, TMutationConfig>,
): ReactQueryFactories<TQueryConfig, TMutationConfig> {
  return {
    createQuery: createQueryFactory({ queryFn: options.queryFn }),
    createInfiniteQuery: createInfiniteQueryFactory({ queryFn: options.queryFn }),
    createMutation: createMutationFactory({ mutationFn: options.mutationFn }),
  };
}

// -------------------- Experiments ---------------------------
{
  type FancyRequest = {
    fancy: string;
  };

  const { createQuery, createInfiniteQuery, createMutation } = createReactQueryFactories({
    queryFn: (config: FancyRequest, context) => {
      context.meta;
      config.fancy;
    },
    mutationFn: (config: FancyRequest, data) => {
      return fetch(config.fancy, {
        body: JSON.stringify(data),
        ...config,
      });
    },
  });

  const test = createQueryKeys('test', (key) => ({
    lol: key<{ test: string; test2: number }>(),
    lol1: key.dynamic<{ test: string; test2: number }, [test: number]>(),
    all: key.infinite<{ items: number[]; a: number }>(),
    all1: key.infinite.dynamic<{ items: number[]; a: number }, [test?: boolean]>(),
  }));

  const useTestQuery = createQuery(test.lol1, {
    request: {
      fancy: 'lol',
    },
    useOptions: {
      select: (data) => data.test,
    },
  });

  const { data } = useTestQuery([1], {
    //    ^?
    select: (data) => data.test2,
  });

  const useInfiniteQuery = createInfiniteQuery(test.all1, {
    getNextPageParam: (data) => data.a,
    //                 ^?
    request:
      (test) =>
      (pageParam = 0) => ({
        // ^?
        fancy: pageParam.toString(),
      }),

    useOptions: (test = true) => ({
      select: (data) => data.pages.flatMap((x) => x.items),
      //       ^?
    }),
  });

  const { data: infiniteData } = useInfiniteQuery([true]);
  //            ^?

  type TestMutationInput = { lol: string };
  type TestMutationResponse = { olo: number };

  const useTestMutation = createMutation<TestMutationResponse, TestMutationInput>({
    request: (data) => ({
      //      ^?
      fancy: data.lol,
    }),
  });

  const { data: mutationData } = useTestMutation();
  //      ^?
}
