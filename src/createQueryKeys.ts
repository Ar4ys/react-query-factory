import type { InfiniteData } from '@tanstack/react-query';

import { Expand, WrapArgInTuple, expandType } from './utils';

const KeyMetadataSymbol = Symbol('KeyMetadataSymbol');
const DefKeySymbol = Symbol('DefKeySymbol');

enum KeyType {
  Def = 'Def',
  GlobalDef = 'GlobalDef',
  Static = 'Static',
  Dynamic = 'Dynamic',
  InfiniteStatic = 'InfiniteStatic',
  InfiniteDynamic = 'InfiniteDynamic',
}

type KeyValue = unknown[];

type AnyKeyMeta = KeyMeta<KeyType, any, any, any[]>;
type KeyMeta<TType extends KeyType, TReturn, TData = TReturn, TArgs extends any[] = []> = {
  /** Exist in runtime */
  TType: TType;
  /** Only type */
  TReturn: TReturn;
  /** Only type */
  TData: TData;
  /** Only type */
  TArgs: TArgs;
};

function createKeyMeta<TKeyMeta extends AnyKeyMeta>(type: TKeyMeta['TType']): TKeyMeta {
  return { TType: type } as TKeyMeta;
}

type WithKeyMeta<T, TMeta extends AnyKeyMeta> = T & {
  [KeyMetadataSymbol]: TMeta;
};

function withKeyMeta<T extends {}, TMeta extends AnyKeyMeta>(
  target: T,
  meta: TMeta,
): WithKeyMeta<T, TMeta> {
  return Object.assign(target, {
    [KeyMetadataSymbol]: meta,
  });
}

type WithDefKey<T, TNested extends Record<string, AnyNonDefKey>> = T & {
  [DefKeySymbol]: TNested;
};

/**
 * TODO: Rewrite using "partial type arguments" when released
 *
 * @see https://github.com/microsoft/TypeScript/pull/26349
 */
function withDefKey<TNested extends Record<string, AnyNonDefKey>>() {
  return <T extends {}>(target: T) => target as WithDefKey<T, TNested>;
}

type Key<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
> = WithKeyMeta<{ queryKey: TKey }, TMeta> & TNested;

function createKey<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
>(key: TKey, meta: TMeta, nestedKeys?: TNested): Key<TKey, TMeta, TNested> {
  return Object.assign(withKeyMeta({ queryKey: key }, meta), nestedKeys);
}

type KeyFn<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
> = WithKeyMeta<
  (...args: TMeta['TArgs']) => Key<[...TKey, TMeta['TArgs']], TMeta, TNested>,
  TMeta
> &
  DefKey<TKey, TMeta, TNested>;

function createKeyFn<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
>(
  key: TKey,
  meta: TMeta,
  nestedKeys?: (key: [...TKey, TMeta['TArgs']]) => TNested,
): KeyFn<TKey, TMeta, TNested> {
  const fn = (...args: TMeta['TArgs']): Key<[...TKey, TMeta['TArgs']], TMeta, TNested> =>
    createKey([...key, args], meta, nestedKeys?.([...key, args]));
  return Object.assign(withKeyMeta(fn, meta), createDefKey<TNested>()(key, meta));
}

type DefKey<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey>,
> = { _def: WithDefKey<WithKeyMeta<TKey, TMeta>, TNested> };

function createDefKey<TNested extends Record<string, AnyNonDefKey> = {}>() {
  return <TKey extends KeyValue, TMeta extends AnyKeyMeta>(
    key: TKey,
    meta: TMeta,
  ): DefKey<TKey, TMeta, TNested> => ({ _def: withDefKey<TNested>()(withKeyMeta(key, meta)) });
}

type GlobalDefKey<TKey extends KeyValue, TNested extends Record<string, AnyNonDefKey>> = {
  _def: WithDefKey<TKey, TNested>;
};

function createGlobalDefKey<TNested extends Record<string, AnyNonDefKey> = {}>() {
  return <TKey extends KeyValue>(key: TKey): GlobalDefKey<TKey, TNested> => ({
    _def: withDefKey<TNested>()(key),
  });
}

export type AnyNonDefKey =
  | Key<any, AnyKeyMeta, Record<any, any>>
  | KeyFn<any, AnyKeyMeta, Record<any, any>>;
export type AnyKey = AnyNonDefKey | DefKey<any, AnyKeyMeta, any> | GlobalDefKey<any, any>;

type StaticKeyMeta<TReturn> = KeyMeta<KeyType.Static, TReturn>;
type InfiniteStaticKeyMeta<TReturn> = KeyMeta<
  KeyType.InfiniteStatic,
  TReturn,
  InfiniteData<TReturn>
>;
type DynamicKeyMeta<TReturn, TArgs extends any[]> = KeyMeta<
  KeyType.Dynamic,
  TReturn,
  TReturn,
  TArgs
>;
type InfiniteDynamicKeyMeta<TReturn, TArgs extends any[]> = KeyMeta<
  KeyType.InfiniteDynamic,
  TReturn,
  InfiniteData<TReturn>,
  TArgs
>;

type KeyTypeToMetaMap = {
  [KeyType.Def]: AnyKeyMeta;
  [KeyType.GlobalDef]: AnyKeyMeta;
  [KeyType.Static]: StaticKeyMeta<any>;
  [KeyType.Dynamic]: DynamicKeyMeta<any, any>;
  [KeyType.InfiniteStatic]: InfiniteStaticKeyMeta<any>;
  [KeyType.InfiniteDynamic]: InfiniteDynamicKeyMeta<any, any>;
};

function isKeyMeta(obj: unknown): obj is AnyKeyMeta;
function isKeyMeta<TKeyType extends KeyType>(
  obj: unknown,
  type: TKeyType,
): obj is KeyTypeToMetaMap[TKeyType];
function isKeyMeta(obj: unknown, type?: KeyType): boolean {
  return (
    !!obj &&
    typeof obj === 'object' &&
    'TType' in obj &&
    typeof obj.TType === 'string' &&
    (type ? type === obj.TType : Object.values(KeyType).includes(obj.TType as KeyType))
  );
}

export type StaticKey<
  TKey extends KeyValue,
  TReturn,
  TNested extends Record<string, AnyNonDefKey> = {},
> = Key<TKey, StaticKeyMeta<TReturn>, TNested>;
export type InfiniteStaticKey<
  TKey extends KeyValue,
  TReturn,
  TNested extends Record<string, AnyNonDefKey> = {},
> = Key<TKey, InfiniteStaticKeyMeta<TReturn>, TNested>;
export type DynamicKey<
  TKey extends KeyValue,
  TReturn,
  TArgs extends any[],
  TNested extends Record<string, AnyNonDefKey> = {},
> = KeyFn<TKey, DynamicKeyMeta<TReturn, TArgs>, TNested>;
export type InfiniteDynamicKey<
  TKey extends KeyValue,
  TReturn,
  TArgs extends any[],
  TNested extends Record<string, AnyNonDefKey> = {},
> = KeyFn<TKey, InfiniteDynamicKeyMeta<TReturn, TArgs>, TNested>;

type FactoryProperty = KeyBuilderCurry<AnyKeyMeta> | WithKeyMeta<FactorySchema, AnyKeyMeta>;

type FactorySchema = {
  [k: string]: FactoryProperty;
};

type KeyBuilderCurry<TMeta extends AnyKeyMeta> = WithKeyMeta<
  <T extends FactorySchema>(nestedKeys: T) => WithKeyMeta<T, TMeta>,
  TMeta
>;

function keyBuilderCurry<TMeta extends AnyKeyMeta>(meta: TMeta) {
  return withKeyMeta(
    <T extends FactorySchema>(nestedKeys: T): WithKeyMeta<T, TMeta> =>
      withKeyMeta(nestedKeys, meta),
    meta,
  );
}

type KeyBuilder = {
  <TReturn = unknown>(): KeyBuilderCurry<StaticKeyMeta<TReturn>>;
  dynamic<TReturn = unknown, TArgs = []>(): KeyBuilderCurry<
    DynamicKeyMeta<TReturn, WrapArgInTuple<TArgs>>
  >;
  infinite: {
    <TReturn = unknown>(): KeyBuilderCurry<InfiniteStaticKeyMeta<TReturn>>;
    dynamic<TReturn = unknown, TArgs = []>(): KeyBuilderCurry<
      InfiniteDynamicKeyMeta<TReturn, WrapArgInTuple<TArgs>>
    >;
  };
};

const keyBuilder: KeyBuilder = Object.assign(
  <TReturn = unknown>() => keyBuilderCurry(createKeyMeta<StaticKeyMeta<TReturn>>(KeyType.Static)),
  {
    dynamic: <TReturn = unknown, TArgs = []>() =>
      keyBuilderCurry(
        createKeyMeta<DynamicKeyMeta<TReturn, WrapArgInTuple<TArgs>>>(KeyType.Dynamic),
      ),

    infinite: Object.assign(
      <TReturn = unknown>() =>
        keyBuilderCurry(createKeyMeta<InfiniteStaticKeyMeta<TReturn>>(KeyType.InfiniteStatic)),
      {
        dynamic: <TReturn = unknown, TArgs = []>() =>
          keyBuilderCurry(
            createKeyMeta<InfiniteDynamicKeyMeta<TReturn, WrapArgInTuple<TArgs>>>(
              KeyType.InfiniteDynamic,
            ),
          ),
      },
    ),
  },
);

type MapFactoryPropertyToKey<
  TKey extends KeyValue,
  TProp extends FactoryProperty,
> = TProp extends WithKeyMeta<infer TNestedKeys, infer TMeta>
  ? TMeta extends StaticKeyMeta<any>
    ? StaticKey<TKey, TMeta['TReturn'], FallbackMapFactorySchema<TKey, TNestedKeys>>
    : TMeta extends DynamicKeyMeta<any, any>
    ? DynamicKey<
        TKey,
        TMeta['TReturn'],
        TMeta['TArgs'],
        FallbackMapFactorySchema<[...TKey, TMeta['TArgs']], TNestedKeys>
      >
    : TMeta extends InfiniteStaticKeyMeta<any>
    ? InfiniteStaticKey<TKey, TMeta['TReturn'], FallbackMapFactorySchema<TKey, TNestedKeys>>
    : TMeta extends InfiniteDynamicKeyMeta<any, any>
    ? InfiniteDynamicKey<
        TKey,
        TMeta['TReturn'],
        TMeta['TArgs'],
        FallbackMapFactorySchema<[...TKey, TMeta['TArgs']], TNestedKeys>
      >
    : never
  : never;

type MapFactorySchema<TKey extends KeyValue, TSchema extends FactorySchema> = {
  [K in keyof TSchema]: MapFactoryPropertyToKey<[...TKey, K], TSchema[K]>;
};

type FallbackMapFactorySchema<TKey extends KeyValue, TSchema> = Expand<
  TSchema extends FactorySchema ? MapFactorySchema<TKey, TSchema> : {}
>;

type QueryKeyFactoryResult<TKey extends string, TSchema extends FactorySchema> = Expand<
  MapFactorySchema<[TKey], TSchema> &
    GlobalDefKey<[TKey], Expand<MapFactorySchema<[TKey], TSchema>>>
>;

type SchemaBuilder<T> = (keyBuilder: KeyBuilder) => T;

function mapFactorySchema<TKey extends KeyValue, TSchema extends FactorySchema>(
  rootKey: TKey,
  schema: TSchema,
): MapFactorySchema<TKey, TSchema> {
  const result: Record<string, AnyKey> = {};

  for (const [key, value] of Object.entries(schema)) {
    const meta = value[KeyMetadataSymbol];

    if (isKeyMeta(meta, KeyType.Static) || isKeyMeta(meta, KeyType.InfiniteStatic)) {
      const nestedKeys = !(value instanceof Function) && mapFactorySchema([...rootKey, key], value);
      result[key] = createKey([...rootKey, key], meta, nestedKeys || undefined);
    } else if (isKeyMeta(meta, KeyType.Dynamic) || isKeyMeta(meta, KeyType.InfiniteDynamic)) {
      const nestedKeys =
        !(value instanceof Function) &&
        ((dynamicKey: KeyValue) => mapFactorySchema(dynamicKey, value));
      result[key] = createKeyFn([...rootKey, key], meta, nestedKeys || undefined);
    }
  }

  return result as MapFactorySchema<TKey, TSchema>;
}

export type GetKeyValue<T extends AnyKey> = T extends Key<infer K, any, Record<any, any>>
  ? K
  : T extends KeyFn<infer K, any, Record<any, any>>
  ? K
  : T extends DefKey<infer K, any, Record<any, any>>
  ? K
  : T extends GlobalDefKey<infer K, Record<any, any>>
  ? K
  : never;

export type GetKeyMeta<T extends AnyKey> = T extends Key<any, infer K, Record<any, any>>
  ? K
  : T extends KeyFn<any, infer K, Record<any, any>>
  ? K
  : T extends DefKey<any, infer K, Record<any, any>>
  ? K
  : never;

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
  const result = mapFactorySchema(key, schemaFactory(keyBuilder));
  return expandType(Object.assign(result, createGlobalDefKey<Expand<typeof result>>()(key)));
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

  test('Correct type', () => {
    type ExpectedTestKeysDef = {
      _def: WithDefKey<['test'], ExpectedTestKeys>;
    };

    type ExpectedTestKeys = {
      all: Key<['test', 'all'], StaticKeyMeta<unknown>>;
      detail: WithKeyMeta<
        ((
          userId: string,
        ) => Key<
          ['test', 'detail', [userId: string]],
          DynamicKeyMeta<string, [userId: string]>
        >) & {
          _def: WithKeyMeta<['test', 'detail'], DynamicKeyMeta<string, [userId: string]>>;
        },
        DynamicKeyMeta<string, [userId: string]>
      >;
      list: Key<['test', 'list'], StaticKeyMeta<boolean>> & {
        search: WithKeyMeta<
          ((arg: {
            lol: string;
          }) => Key<
            ['test', 'list', 'search', [{ lol: string }]],
            DynamicKeyMeta<string, [{ lol: string }]>
          >) & {
            _def: WithKeyMeta<
              ['test', 'list', 'search'],
              DynamicKeyMeta<string, [{ lol: string }]>
            >;
          },
          DynamicKeyMeta<string, [{ lol: string }]>
        >;
      };
      byId: WithKeyMeta<
        ((id: string) => Key<
          ['test', 'byId', [id: string]],
          DynamicKeyMeta<boolean, [id: string]>
        > & {
          likes: Key<['test', 'byId', [string], 'likes'], StaticKeyMeta<number>>;
        }) & {
          // FIXME: It should also have nestedKeys, but TS cannot validate this
          _def: WithKeyMeta<['test', 'byId'], DynamicKeyMeta<boolean, [id: string]>>;
        },
        DynamicKeyMeta<boolean, [id: string]>
      >;
    };

    type ExpectedResult = ExpectedTestKeysDef & ExpectedTestKeys;

    assertType<ExpectedResult['_def']>(testKeys._def);
    assertType<ExpectedResult['all']>(testKeys.all);
    assertType<ExpectedResult['detail']>(testKeys.detail);
    assertType<ExpectedResult['detail']['_def']>(testKeys.detail._def);
    assertType<ExpectedResult['list']>(testKeys.list);
    assertType<ExpectedResult['list']['search']>(testKeys.list.search);
    assertType<ExpectedResult['list']['search']['_def']>(testKeys.list.search._def);
    assertType<ExpectedResult['byId']>(testKeys.byId);
    assertType<ExpectedResult['byId']['_def']>(testKeys.byId._def);
    assertType<ReturnType<ExpectedResult['byId']>>(testKeys.byId(''));
    assertType<ReturnType<ExpectedResult['byId']>['likes']>(testKeys.byId('').likes);
  });

  test('Correct runtime value', () => {
    const key = (x: unknown[], type: KeyType) => createKey(x, createKeyMeta(type));
    const def = (x: unknown[], type: KeyType) => createDefKey()(x, createKeyMeta(type))._def;

    expect(testKeys._def).toStrictEqual(createGlobalDefKey()(['test'])._def);
    expect(testKeys.all).toStrictEqual(key(['test', 'all'], KeyType.Static));

    expect(testKeys.detail._def).toStrictEqual(def(['test', 'detail'], KeyType.Dynamic));
    expect(testKeys.detail('string')).toStrictEqual(
      key(['test', 'detail', ['string']], KeyType.Dynamic),
    );

    expect(testKeys.list).toMatchObject(key(['test', 'list'], KeyType.Static));
    expect(testKeys.list.search._def).toStrictEqual(
      def(['test', 'list', 'search'], KeyType.Dynamic),
    );
    expect(testKeys.list.search({ lol: 'string' })).toStrictEqual(
      key(['test', 'list', 'search', [{ lol: 'string' }]], KeyType.Dynamic),
    );

    expect(testKeys.byId._def).toStrictEqual(def(['test', 'byId'], KeyType.Dynamic));
    expect(testKeys.byId('string')).toMatchObject(
      key(['test', 'byId', ['string']], KeyType.Dynamic),
    );
    expect(testKeys.byId('string').likes).toStrictEqual(
      key(['test', 'byId', ['string'], 'likes'], KeyType.Static),
    );
  });
}
