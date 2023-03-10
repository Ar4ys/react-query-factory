import { InfiniteData } from '@tanstack/react-query';

const KeyMetadataSymbol = Symbol('KeyBuilderSymbol');
const KeyBuilderSymbol = Symbol('KeyBuilderSymbol');

export type KeyMeta<T> = { returnType: T };

// Should we define what is considered a valid query key? react-query uses `readonly unknown[]`
// type AnyObject = Record<string, unknown>;
// type ValidKeyValue = string | number | boolean | null | undefined | symbol | AnyObject;
type MaybeReadonly<T> = T | Readonly<T>;
type ValidKeyValue = unknown;
type Tuple = [ValidKeyValue, ...ValidKeyValue[]];
type KeyTuple = MaybeReadonly<Tuple>;

export type Key<TKey, TMeta extends KeyMeta<any>> = KeyDef<{ queryKey: TKey }, TMeta>;
export type DynamicKey<
  TKeyBase extends MaybeReadonly<any[]>,
  TKey extends MaybeReadonly<any[]>,
  TMeta extends KeyMeta<any>,
  TArgs extends any[],
  TRest = {},
> = {
  (...args: TArgs): Key<[...TKeyBase, ...TKey], TMeta> & TRest;
  _def: KeyDef<TKeyBase, TMeta>;
};

type KeyDef<T, M extends KeyMeta<any>> = T & { [KeyMetadataSymbol]: M };
type KeyBuilder = {
  <TReturn = unknown>(): KeyBuilderCurry<TReturn>;
  infinite<TReturn = unknown>(): KeyBuilderCurry<InfiniteData<TReturn>>;
};
type KeyBuilderCurry<TReturn> = {
  [KeyBuilderSymbol]: true;
  <T extends DynamicKeySchema | FactoryPropertyObject>(key: T): KeyDef<T, KeyMeta<TReturn>>;
};

type SchemaBuilder<T> = (keyBuilder: KeyBuilder) => T;

type FactoryProperty = KeyBuilderCurry<any> | DynamicKeySchema | KeyTuple | FactoryPropertyObject;
interface FactoryPropertyObject {
  [K: string]: FactoryProperty;
}
type FactoryPropertyObjectWithQueryKey = FactoryPropertyObject & {
  queryKey: KeyTuple;
};

export type DynamicKeySchema = (...args: any[]) => KeyTuple | FactoryPropertyObjectWithQueryKey;

type FactorySchema = Record<string, FactoryProperty>;

type MapFactoryPropertyToKey<
  TKey extends ValidKeyValue[],
  TProp extends FactoryProperty,
> = TProp extends Tuple
  ? Key<[...TKey, ...TProp], KeyMeta<unknown>>
  : TProp extends FactoryPropertyObject
  ? Key<TKey, KeyMeta<unknown>> & MapFactorySchema<TKey, TProp>
  : TProp extends KeyBuilderCurry<infer Return>
  ? Key<TKey, KeyMeta<Return>>
  : TProp extends KeyDef<infer Fn extends (...args: any[]) => KeyTuple, infer Meta>
  ? DynamicKey<TKey, ReturnType<Fn>, Meta, Parameters<Fn>>
  : TProp extends KeyDef<
      infer Fn extends (...args: any[]) => FactoryPropertyObjectWithQueryKey,
      infer Meta
    >
  ? DynamicKey<
      TKey,
      ReturnType<Fn>['queryKey'],
      Meta,
      Parameters<Fn>,
      MapFactorySchema<[...TKey, ...ReturnType<Fn>['queryKey']], Omit<ReturnType<Fn>, 'queryKey'>>
    >
  : TProp extends KeyDef<infer Object extends FactoryPropertyObject, infer Meta>
  ? Key<TKey, Meta> & MapFactorySchema<TKey, Object>
  : never;

type MapFactorySchema<TKey extends ValidKeyValue[], TSchema extends FactorySchema> = {
  [K in keyof TSchema]: MapFactoryPropertyToKey<[...TKey, K], TSchema[K]>;
};

type QueryKeyFactoryResult<TKey extends string, TSchema extends FactorySchema> = {
  _def: KeyDef<[TKey], KeyMeta<unknown>>;
} & MapFactorySchema<[TKey], TSchema>;

const keyBuilderCurry: KeyBuilderCurry<any> = Object.assign((k: any) => k, {
  [KeyBuilderSymbol]: true as const,
});

const keyBuilder: KeyBuilder = Object.assign(() => keyBuilderCurry, {
  infinite: () => keyBuilderCurry,
});

const isArray = (arg: any): arg is any[] | readonly any[] => Array.isArray(arg);

const createKeyDef = <T extends object>(t: T): KeyDef<T, KeyMeta<any>> =>
  Object.assign(t, {
    [KeyMetadataSymbol]: {
      returnType: true,
    },
  }) as KeyDef<T, KeyMeta<any>>;

const createKey = <T extends ValidKeyValue[]>(queryKey: T): Key<T, KeyMeta<any>> =>
  createKeyDef({
    queryKey,
  });

function mapFactorySchema<TKey extends ValidKeyValue[], TSchema extends FactorySchema>(
  queryKey: TKey,
  schema: TSchema,
): MapFactorySchema<TKey, TSchema> {
  const result: Record<string, MapFactoryPropertyToKey<ValidKeyValue[], FactoryProperty>> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (isArray(value)) {
      result[key] = createKey([...queryKey, key, ...value]);
    } else if (typeof value === 'object') {
      result[key] = Object.assign(
        createKey([...queryKey, key]),
        mapFactorySchema([...queryKey, key], value),
      );
    } else if (KeyBuilderSymbol in value) {
      result[key] = createKey([...queryKey, key]);
    } else {
      const keyFunctor = (...args: any) => {
        const result = value(...args);
        if (isArray(result)) {
          return createKey([...queryKey, key, ...result]);
        } else {
          const { queryKey: dynQueryKey, ...rest } = result;
          const a = Object.assign(
            createKey([...queryKey, key, ...dynQueryKey]),
            mapFactorySchema([...queryKey, key, ...dynQueryKey], rest),
          );

          return a;
        }
      };

      // @ts-ignore Idk how to type this
      result[key] = Object.assign(keyFunctor, {
        _def: createKeyDef([...queryKey, key]),
      });
    }
  }

  return result as MapFactorySchema<TKey, TSchema>;
}

/**
 * It seems like there is no reason to leave Response types in `createQueryKeys`, because the way I
 * intended API of my library to work is by using "helper" methods on hooks, like this:
 *
 * ```ts
 * const useTest = createQuery(...)
 *
 * const queryClient = new QueryClient()
 * // or
 * const queryClient = useQueryClient()
 *
 * useTest.helpers(queryClient).invalidate()
 * useTest.helpers(queryClient).setQueryData()
 * ```
 *
 * This simplifies library a lot, because I don't need to write `QueryClientWrapper` anymore, which
 * could leverage all cool features of my library (`queryKey` typing, `immer`, etc). Instead all
 * features will be inside hook "helpers".
 *
 * Reasons to leave `createQueryKeys` as is:
 *
 * - QueryClient#getQueriesData
 * - QueryClient#setQueriesData (but we can still provide `setQueriesData` for queries with dynamic
 *   keys)
 * - QueryClient#resetQueries (? maybe)
 * - QueryClient#invalidateQueries (? maybe)
 * - QueryClient#refetchQueries (? maybe)
 */
export function createQueryKeys<TKey extends string, TSchema extends FactorySchema>(
  queryDef: TKey,
  schemaFactory: SchemaBuilder<TSchema>,
): QueryKeyFactoryResult<TKey, TSchema> {
  const key: [TKey] = [queryDef];
  return {
    _def: createKeyDef(key),
    ...mapFactorySchema(key, schemaFactory(keyBuilder)),
  };
}

if (import.meta.vitest) {
  const { test, expect, assertType } = import.meta.vitest;

  const testKeys = createQueryKeys('test', (k) => ({
    all: k(),
    all2: [''],
    detail: k<string>()((userId: string) => [userId]),
    list: k<string>()({
      search: k<string>()((filters: { lol: string }) => [filters]),
    }),
    byId: k<boolean>()((id: string) => ({
      queryKey: [id],
      likes: k<number>(),
    })),
  }));

  test('Correct type', () => {
    type ExpectedTestKeys = {
      _def: KeyDef<['test'], KeyMeta<unknown>>;
      all: Key<['test', 'all'], KeyMeta<unknown>>;
      all2: Key<['test', 'all2', string], KeyMeta<unknown>>;
      detail: ((userId: string) => Key<['test', 'detail', string], KeyMeta<string>>) & {
        _def: KeyDef<['test', 'detail'], KeyMeta<string>>;
      };
      list: Key<['test', 'list'], KeyMeta<string>> & {
        search: ((filters: {
          lol: string;
        }) => Key<['test', 'list', 'search', { lol: string }], KeyMeta<string>>) & {
          _def: KeyDef<['test', 'list', 'search'], KeyMeta<string>>;
        };
      };
      byId: ((id: string) => {
        queryKey: ['test', 'byId', string];
        likes: Key<['test', 'byId', string, 'likes'], KeyMeta<number>>;
      }) & {
        _def: ['test', 'byId'];
      };
    };

    assertType<ExpectedTestKeys>(testKeys);
  });

  test('Correct runtime value', () => {
    const key = (x: unknown[]) => createKey(x);
    const def = (x: object) => createKeyDef(x);

    expect(testKeys._def).toStrictEqual(def(['test']));
    expect(testKeys.all).toStrictEqual(key(['test', 'all']));
    expect(testKeys.all2).toStrictEqual(key(['test', 'all2', '']));
    expect(testKeys.detail._def).toStrictEqual(def(['test', 'detail']));
    expect(testKeys.detail('string')).toStrictEqual(key(['test', 'detail', 'string']));
    expect(testKeys.list).toMatchObject(key(['test', 'list']));
    expect(testKeys.list.search._def).toStrictEqual(def(['test', 'list', 'search']));
    expect(testKeys.list.search({ lol: 'string' })).toStrictEqual(
      key(['test', 'list', 'search', { lol: 'string' }]),
    );
    expect(testKeys.byId._def).toStrictEqual(def(['test', 'byId']));
    expect(testKeys.byId('string')).toMatchObject(key(['test', 'byId', 'string']));
    expect(testKeys.byId('string').likes).toStrictEqual(key(['test', 'byId', 'string', 'likes']));
  });
}
