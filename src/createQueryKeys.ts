import type { InfiniteData } from '@tanstack/react-query';

const KeyMetadataSymbol = Symbol('KeyBuilderSymbol');
const KeyBuilderSymbol = Symbol('KeyBuilderSymbol');

export type KeyMeta<TReturn> = {
  dynamic: false;
  returnType: TReturn;
};

export type DynamicKeyMeta<TReturn, TArgs extends any[]> = {
  dynamic: true;
  returnType: TReturn;
  fnArgs: TArgs;
};

type ValidKeyValue = unknown;
type MaybeReadonly<T> = T | Readonly<T>;

type KeyDef<T, TMeta> = T & { [KeyMetadataSymbol]: TMeta };

export type Key<TKey, TMeta extends KeyMeta<any> | DynamicKeyMeta<any, any>> = KeyDef<
  { queryKey: TKey },
  TMeta
>;
export type DynamicKey<
  TKey extends MaybeReadonly<any[]>,
  TMeta extends DynamicKeyMeta<any, any>,
  TRest = {},
> = {
  (...args: TMeta['fnArgs']): Key<[...TKey, TMeta['fnArgs']], TMeta> & TRest;
  _def: KeyDef<TKey, KeyMeta<TMeta['returnType']>>;
};

type KeyBuilderCurry<TReturn> = {
  [KeyBuilderSymbol]: { dynamic: false };
  <T extends FactorySchema>(key: T): KeyDef<T, KeyMeta<TReturn>>;
};
type DynamicKeyBuilderCurry<TReturn, TArgs extends any[]> = {
  [KeyBuilderSymbol]: { dynamic: true };
  <T extends FactorySchema>(key: T): KeyDef<T, DynamicKeyMeta<TReturn, TArgs>>;
};

type WrapArgInTuple<T> = T extends any[] ? T : [arg: T];

type KeyBuilder = {
  <TReturn = unknown>(): KeyBuilderCurry<TReturn>;
  dynamic<TReturn = unknown, TArgs = []>(): DynamicKeyBuilderCurry<TReturn, WrapArgInTuple<TArgs>>;
  infinite: {
    <TReturn = unknown>(): KeyBuilderCurry<InfiniteData<TReturn>>;
    dynamic<TReturn = unknown, TArgs = []>(): DynamicKeyBuilderCurry<
      InfiniteData<TReturn>,
      WrapArgInTuple<TArgs>
    >;
  };
};

type SchemaBuilder<T> = (keyBuilder: KeyBuilder) => T;

type FactoryProperty =
  | KeyDef<FactorySchema, any>
  | KeyBuilderCurry<any>
  | DynamicKeyBuilderCurry<any, any>;

interface FactorySchema {
  [K: string]: FactoryProperty;
}

type MapFactoryPropertyToKey<
  TKey extends ValidKeyValue[],
  TProp extends FactoryProperty,
> = TProp extends KeyBuilderCurry<infer TReturn>
  ? Key<TKey, KeyMeta<TReturn>>
  : TProp extends KeyDef<infer TInnerKeys extends FactorySchema, infer TMeta extends KeyMeta<any>>
  ? Key<TKey, TMeta> & MapFactorySchema<TKey, TInnerKeys>
  : TProp extends DynamicKeyBuilderCurry<infer TReturn, infer TArgs>
  ? DynamicKey<TKey, DynamicKeyMeta<TReturn, TArgs>>
  : TProp extends KeyDef<
      infer TInnerKeys extends FactorySchema,
      infer TMeta extends DynamicKeyMeta<any, any>
    >
  ? DynamicKey<TKey, TMeta, MapFactorySchema<[...TKey, TMeta['fnArgs']], TInnerKeys>>
  : never;

type MapFactorySchema<TKey extends ValidKeyValue[], TSchema extends FactorySchema> = {
  [K in keyof TSchema]: MapFactoryPropertyToKey<[...TKey, K], TSchema[K]>;
};

type QueryKeyFactoryResult<TKey extends string, TSchema extends FactorySchema> = {
  _def: KeyDef<[TKey], KeyMeta<unknown>>;
} & MapFactorySchema<[TKey], TSchema>;

const keyBuilderCurry: KeyBuilderCurry<any> = Object.assign((k: any) => createKeyDef(k), {
  [KeyBuilderSymbol]: { dynamic: false as const },
});
const dynamicKeyBuilderCurry: DynamicKeyBuilderCurry<any, any> = Object.assign(
  (k: any) => createKeyDef(k, { dynamic: true }),
  {
    [KeyBuilderSymbol]: { dynamic: true as const },
  },
);

const keyBuilder: KeyBuilder = Object.assign(() => keyBuilderCurry, {
  dynamic: () => dynamicKeyBuilderCurry,
  infinite: Object.assign(() => keyBuilderCurry, {
    dynamic: () => dynamicKeyBuilderCurry,
  }),
});

function createKeyDef<T extends object>(t: T, params?: { dynamic: false }): KeyDef<T, KeyMeta<any>>;

function createKeyDef<T extends object>(
  t: T,
  params: { dynamic: true },
): KeyDef<T, DynamicKeyMeta<any, any>>;

function createKeyDef<T extends object>(
  t: T,
  { dynamic }: { dynamic: boolean } = { dynamic: false },
): KeyDef<T, KeyMeta<any> | DynamicKeyMeta<any, any>> {
  return Object.assign(t, {
    [KeyMetadataSymbol]: { dynamic },
  }) as KeyDef<T, KeyMeta<any> | DynamicKeyMeta<any, any>>;
}

function createKey<T extends ValidKeyValue[]>(
  queryKey: T,
  params?: { dynamic: false },
): Key<T, KeyMeta<any>>;

function createKey<T extends ValidKeyValue[]>(
  queryKey: T,
  params: { dynamic: true },
): Key<T, DynamicKeyMeta<any, any>>;

function createKey<T extends ValidKeyValue[]>(
  queryKey: T,
  params: { dynamic: boolean } = { dynamic: false },
): Key<T, KeyMeta<any> | DynamicKeyMeta<any, any>> {
  return createKeyDef({ queryKey }, params as { dynamic: any });
}

function mapFactorySchema<TKey extends ValidKeyValue[], TSchema extends FactorySchema>(
  queryKey: TKey,
  schema: TSchema,
): MapFactorySchema<TKey, TSchema> {
  const result: Record<string, MapFactoryPropertyToKey<ValidKeyValue[], FactoryProperty>> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (KeyBuilderSymbol in value && !value[KeyBuilderSymbol].dynamic) {
      result[key] = createKey([...queryKey, key]);
    } else if (KeyMetadataSymbol in value && !value[KeyMetadataSymbol].dynamic) {
      result[key] = Object.assign(
        createKey([...queryKey, key]),
        mapFactorySchema([...queryKey, key], value),
      );
    } else if (KeyBuilderSymbol in value && value[KeyBuilderSymbol].dynamic) {
      const keyFn: DynamicKey<[...TKey, typeof key], DynamicKeyMeta<any, any>> = Object.assign(
        (...args: any[]) =>
          createKey([...queryKey, key, args] as [...TKey, string, any[]], { dynamic: true }),
        { _def: createKeyDef([...queryKey, key] as [...TKey, string]) },
      );
      result[key] = keyFn;
    } else if (KeyMetadataSymbol in value && value[KeyMetadataSymbol].dynamic) {
      const keyFn: DynamicKey<[...TKey, typeof key], DynamicKeyMeta<any, any>> = Object.assign(
        (...args: any[]) =>
          Object.assign(
            createKey([...queryKey, key, args] as [...TKey, string, any[]], { dynamic: true }),
            mapFactorySchema([...queryKey, key, args], value),
          ),
        { _def: createKeyDef([...queryKey, key] as [...TKey, string]) },
      );

      result[key] = keyFn;
    }
  }

  return result as MapFactorySchema<TKey, TSchema>;
}

/**
 * TODO: New `createQueryKeys` syntax
 *
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
 * useTest.helpers(queryClient).setQueriesDataByDef()
 * useTest.helpers(queryClient).getData()
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
 *
 * **Objection!**
 *
 * We decided to leave query typing in `createQueryKeys` just because we found better way to define
 * keys (already refactored). So, we still need to create QueryClient wrapper, that will be able to
 * leverage `createQueryKeys` typing.
 *
 * Note: `setQueriesData` in `queryClient` wrapper should behave the same way, as it behaves in
 * `tanstack/query-core`
 *
 * TODO: `setQueriesData` in hook helpers
 *
 * `setQueriesData` in hook helpers should behave differently from `setQueriesData` in
 * `queryClient`. It should execute `QueryClient#setQueriesData` under the hood with `predicate`
 * that will filter queries by our own "partial matching" of query keys. Each `any` represents
 * possible arguments in dynamic queries. So that our patter matching works like this:
 *
 * - Every "static" value in key should match exactly ("test", "events" and "filter" in example below)
 * - Every "any" represent any value ("any" as in TS `any`)
 * - `queryKey` length should match strictly (so that we don't match nested keys accidentally)
 *
 * @example
 *   useTestQuery.helper(queryClient).setQueriesData(() => {});
 *   testKeys.events(any).filter(any);
 *   // => ["test", "events", any, "filter", any]
 *
 *   useTestQuery.helper(queryClient).setQueriesData([[1]], () => {});
 *   testKeys.events(1).filter(any);
 *   // => ["test", "events", [1], "filter", any]
 *
 *   useTestQuery.helper(queryClient).setQueriesData([[1], ['asd']], () => {});
 *   testKeys.events(1).filter('asd');
 *   // => ["test", "events", [1], "filter", ['asd']]
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

  const testKeys = createQueryKeys('test', (key) => ({
    all: key(),
    detail: key.dynamic<string, [userId: string]>(),
    list: key<boolean>()({
      search: key.dynamic<string, { lol: string }>(),
    }),
    byId: key.dynamic<boolean, [id: string]>()({
      likes: key<number>(),
    }),
  }));

  testKeys.byId('asd').likes.queryKey;

  test('Correct type', () => {
    type ExpectedTestKeys = {
      _def: KeyDef<['test'], KeyMeta<unknown>>;
      all: Key<['test', 'all'], KeyMeta<unknown>>;
      detail: ((
        userId: string,
      ) => Key<['test', 'detail', [userId: string]], DynamicKeyMeta<string, [userId: string]>>) & {
        _def: KeyDef<['test', 'detail'], KeyMeta<string>>;
      };
      list: Key<['test', 'list'], KeyMeta<boolean>> & {
        search: ((arg: {
          lol: string;
        }) => Key<
          ['test', 'list', 'search', [{ lol: string }]],
          DynamicKeyMeta<string, [{ lol: string }]>
        >) & {
          _def: KeyDef<['test', 'list', 'search'], KeyMeta<string>>;
        };
      };
      byId: ((id: string) => Key<
        ['test', 'byId', [id: string]],
        DynamicKeyMeta<boolean, [id: string]>
      > & {
        likes: Key<['test', 'byId', [string], 'likes'], KeyMeta<number>>;
      }) & {
        _def: ['test', 'byId'];
      };
    };

    assertType<ExpectedTestKeys>(testKeys);
  });

  test('Correct runtime value', () => {
    const key = (x: unknown[], dynamic: any = false) => createKey(x, { dynamic });
    const def = (x: object, dynamic: any = false) => createKeyDef(x, { dynamic });

    expect(testKeys._def).toStrictEqual(def(['test']));
    expect(testKeys.all).toStrictEqual(key(['test', 'all']));

    expect(testKeys.detail._def).toStrictEqual(def(['test', 'detail']));
    expect(testKeys.detail('string')).toStrictEqual(key(['test', 'detail', ['string']], true));

    expect(testKeys.list).toMatchObject(key(['test', 'list']));
    expect(testKeys.list.search._def).toStrictEqual(def(['test', 'list', 'search']));
    expect(testKeys.list.search({ lol: 'string' })).toStrictEqual(
      key(['test', 'list', 'search', [{ lol: 'string' }]], true),
    );

    expect(testKeys.byId._def).toStrictEqual(def(['test', 'byId']));
    expect(testKeys.byId('string')).toMatchObject(key(['test', 'byId', ['string']], true));
    expect(testKeys.byId('string').likes).toStrictEqual(key(['test', 'byId', ['string'], 'likes']));
  });
}
