import { QueryFunctionContext } from '@tanstack/react-query';

import { CreateInfiniteQuery } from './createInfiniteQuery';
import { CreateMutation } from './createMutation';
import { CreateQuery } from './createQuery';
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

type QueryFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  context: Omit<QueryFunctionContext, 'pageParam'>,
) => unknown | Promise<unknown>;

type MutationFunction<TConfig = BaseRequestConfig> = (
  config: TConfig,
  data: unknown,
) => unknown | Promise<unknown>;

type CreateReactQueryFactoriesOptions<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
> = {
  /** Default implementation is `fetch` */
  queryFn: QueryFunction<TQueryConfig>;
  /** Default implementation is `fetch` with `POST` method */
  mutationFn: MutationFunction<TMutationConfig>;
};

export function createReactQueryFactories<
  TQueryConfig = BaseRequestConfig,
  TMutationConfig = BaseRequestConfig,
>(
  options: CreateReactQueryFactoriesOptions<TQueryConfig, TMutationConfig>,
): ReactQueryFactories<TQueryConfig, TMutationConfig> {
  return null!;
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

  const test = createQueryKeys('test', (k) => ({
    lol: k<{ test: string; test2: number }>(),
    all: k.infinite<{ items: number[]; a: number }>()((test: boolean) => [test]),
  }));

  const useTestQuery = createQuery(test.lol, {
    request: {
      fancy: 'lol',
    },
    select: (data) => data.test,
  });

  const { data } = useTestQuery({
    //    ^?
    select: (data) => data.test2,
  });

  const useInfiniteQuery = createInfiniteQuery(test.all, (test) => ({
    getNextPageParam: (data) => data.a,
    //                 ^?
    request: (pageParam) => ({
      //      ^?
      fancy: pageParam.toString(),
    }),
    select: (data) => data.pages.flatMap((x) => x.items),
  }));

  const { data: infiniteData } = useInfiniteQuery([true]);
  //            ^?

  type TestMutationInput = { lol: string };
  type TestMutationResponse = { olo: number };

  const useTestMutation = createMutation<TestMutationResponse, TestMutationInput>((data) => {
    return {
      request: {
        fancy: data.lol,
      },
    };
  });

  const { data: mutationData } = useTestMutation();
  //      ^?
}
