import type { InfiniteData } from '@tanstack/react-query';

import { Expand, WrapArgInTuple, expandType } from './utils';

const KeyMetadataSymbol = Symbol('KeyMetadataSymbol');
const KeyDefSymbol = Symbol('DefKeySymbol');
const GlobalKeyDefSymbol = Symbol('GlobalKeyDefSymbol');

export enum KeyType {
  Def = 'Def',
  GlobalDef = 'GlobalDef',
  Static = 'Static',
  Dynamic = 'Dynamic',
  InfiniteStatic = 'InfiniteStatic',
  InfiniteDynamic = 'InfiniteDynamic',
}

export type KeyValue = unknown[] | readonly unknown[];

export type AnyKeyMeta<TType extends KeyType = KeyType> = KeyMeta<TType, any, any, any[]>;
export type KeyMeta<TType extends KeyType, TReturn, TData = TReturn, TArgs extends any[] = []> = {
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

export type AnyKeyObj<TType extends KeyType = KeyType> = KeyObj<
  KeyValue,
  AnyKeyMeta<TType>,
  Record<any, any>
>;
export type KeyObj<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
> = WithKeyMeta<{ queryKey: TKey }, TMeta> & TNested;

function createKeyObj<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
>(key: TKey, meta: TMeta, nestedKeys?: TNested): KeyObj<TKey, TMeta, TNested> {
  return Object.assign(withKeyMeta({ queryKey: key }, meta), nestedKeys);
}

export type AnyKeyFn = KeyFn<KeyValue, AnyKeyMeta, Record<any, any>>;
export type KeyFn<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
> = WithKeyMeta<
  (...args: TMeta['TArgs']) => KeyObj<[...TKey, TMeta['TArgs']], TMeta, TNested>,
  TMeta
> & {
  _def: KeyDef<TKey, KeyObj<[...TKey, TMeta['TArgs']], TMeta, TNested>>;
};

function createKeyFn<
  TKey extends KeyValue,
  TMeta extends AnyKeyMeta,
  TNested extends Record<string, AnyNonDefKey> = {},
>(
  key: TKey,
  meta: TMeta,
  nestedKeys?: (key: [...TKey, TMeta['TArgs']]) => TNested,
): KeyFn<TKey, TMeta, TNested> {
  const fn = (...args: TMeta['TArgs']): KeyObj<[...TKey, TMeta['TArgs']], TMeta, TNested> =>
    createKeyObj([...key, args], meta, nestedKeys?.([...key, args]));
  return Object.assign(withKeyMeta(fn, meta), { _def: createKeyDef<ReturnType<typeof fn>>()(key) });
}

// TODO: `DefKey` should accept `TNestedKey extends AnyKeyFn` instead of `TMeta` and `TNested`
// We need this to correctly infer `Query` type in `ResolveNestedKeys` and `MapKeyToQuery`.
// By correctly I mean the key, that `_def` is attached to, should be used to infer `Query`
// type, instead of the `DefKey` itself. This is because `DefKey` is not an actual key and
// you cannot create query with this key - it should be used only in `QueryFilter`.
export type AnyKeyDef = KeyDef<KeyValue, AnyKeyObj>;
export type KeyDef<TKey extends KeyValue, TBoundKey extends AnyKeyObj> = TKey & {
  [KeyDefSymbol]: TBoundKey;
};

function createKeyDef<TBoundKey extends AnyKeyObj>() {
  return <TKey extends KeyValue>(key: TKey): KeyDef<TKey, TBoundKey> =>
    Object.assign(key, {
      [KeyDefSymbol]: true as any as TBoundKey,
    });
}

export type AnyGlobalKeyDef = GlobalKeyDef<KeyValue, Record<any, any>>;
export type GlobalKeyDef<
  TKey extends KeyValue,
  TNested extends Record<string, AnyNonDefKey>,
> = TKey & { [GlobalKeyDefSymbol]: TNested };

function createGlobalKeyDef<TNested extends Record<string, AnyNonDefKey> = {}>() {
  return <TKey extends KeyValue>(key: TKey) => key as GlobalKeyDef<TKey, TNested>;
}

export type AnyNonDefKey = AnyKeyObj | AnyKeyFn;
export type AnyKey = AnyNonDefKey | AnyKeyDef | AnyGlobalKeyDef;

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
> = KeyObj<TKey, StaticKeyMeta<TReturn>, TNested>;
export type InfiniteStaticKey<
  TKey extends KeyValue,
  TReturn,
  TNested extends Record<string, AnyNonDefKey> = {},
> = KeyObj<TKey, InfiniteStaticKeyMeta<TReturn>, TNested>;
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
  MapFactorySchema<[TKey], TSchema> & {
    _def: GlobalKeyDef<[TKey], Expand<MapFactorySchema<[TKey], TSchema>>>;
  }
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
      result[key] = createKeyObj([...rootKey, key], meta, nestedKeys || undefined);
    } else if (isKeyMeta(meta, KeyType.Dynamic) || isKeyMeta(meta, KeyType.InfiniteDynamic)) {
      const nestedKeys =
        !(value instanceof Function) &&
        ((dynamicKey: KeyValue) => mapFactorySchema(dynamicKey, value));
      result[key] = createKeyFn([...rootKey, key], meta, nestedKeys || undefined);
    }
  }

  return result as MapFactorySchema<TKey, TSchema>;
}

export type GetKeyValue<T extends AnyKey> = T extends
  | KeyObj<infer K, AnyKeyMeta, Record<any, any>>
  | KeyFn<infer K, AnyKeyMeta, Record<any, any>>
  | KeyDef<infer K, AnyKeyObj>
  | GlobalKeyDef<infer K, Record<any, any>>
  ? K
  : never;

export type GetKeyMeta<T extends AnyKey> = T extends
  | KeyObj<KeyValue, infer K, Record<any, any>>
  | KeyFn<KeyValue, infer K, Record<any, any>>
  ? K
  : T extends KeyDef<KeyValue, infer K>
  ? GetKeyMeta<K>
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
 * Example:
 *
 * ```ts
 * useTestQuery.helper(queryClient).setQueriesData(() => {});
 * testKeys.events(any).filter(any);
 * // => ["test", "events", any, "filter", any]
 *
 * useTestQuery.helper(queryClient).setQueriesData([[1]], () => {});
 * testKeys.events(1).filter(any);
 * // => ["test", "events", [1], "filter", any]
 *
 * useTestQuery.helper(queryClient).setQueriesData([[1], ['asd']], () => {});
 * testKeys.events(1).filter('asd');
 * // => ["test", "events", [1], "filter", ['asd']]
 * ```
 *
 * TODO: Ability to use nested keys in dynamic queries without calling them
 *
 * Example: `testKeys.byId.likes`
 *
 * This is needed so that we can defined queries with dynamic nested keys, use these keys in
 * `matchQueryByKey`, etc.
 *
 * Problems:
 *
 * - Nested key name can clash with functions methods
 * - How can we determine if nested key of another nested key is dynamic or not?
 */
export function createQueryKeys<TKey extends string, TSchema extends FactorySchema>(
  queryDef: TKey,
  schemaFactory: SchemaBuilder<TSchema>,
): QueryKeyFactoryResult<TKey, TSchema> {
  const key: [TKey] = [queryDef];
  const result = mapFactorySchema(key, schemaFactory(keyBuilder));
  return expandType(
    Object.assign(result, { _def: createGlobalKeyDef<Expand<typeof result>>()(key) }),
  );
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
      _def: ['test'] & { [GlobalKeyDefSymbol]: ExpectedTestKeys };
    };

    type ExpectedTestKeys = {
      all: KeyObj<['test', 'all'], StaticKeyMeta<unknown>>;
      detail: WithKeyMeta<
        ((
          userId: string,
        ) => KeyObj<
          ['test', 'detail', [userId: string]],
          DynamicKeyMeta<string, [userId: string]>
        >) & {
          _def: KeyDef<
            ['test', 'detail'],
            KeyObj<['test', 'detail', [userId: string]], DynamicKeyMeta<string, [userId: string]>>
          >;
        },
        DynamicKeyMeta<string, [userId: string]>
      >;
      list: KeyObj<['test', 'list'], StaticKeyMeta<boolean>> & {
        search: WithKeyMeta<
          ((arg: {
            lol: string;
          }) => KeyObj<
            ['test', 'list', 'search', [{ lol: string }]],
            DynamicKeyMeta<string, [{ lol: string }]>
          >) & {
            _def: KeyDef<
              ['test', 'list', 'search'],
              KeyObj<
                ['test', 'list', 'search', [{ lol: string }]],
                DynamicKeyMeta<string, [{ lol: string }]>
              >
            >;
          },
          DynamicKeyMeta<string, [{ lol: string }]>
        >;
      };
      byId: WithKeyMeta<
        ((id: string) => KeyObj<
          ['test', 'byId', [id: string]],
          DynamicKeyMeta<boolean, [id: string]>
        > & {
          likes: KeyObj<['test', 'byId', [string], 'likes'], StaticKeyMeta<number>>;
        }) & {
          _def: KeyDef<
            ['test', 'byId'],
            KeyObj<['test', 'byId', [id: string]], DynamicKeyMeta<boolean, [id: string]>> & {
              likes: KeyObj<['test', 'byId', [string], 'likes'], StaticKeyMeta<number>>;
            }
          >;
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
    const key = (x: unknown[], type: KeyType) => createKeyObj(x, createKeyMeta(type));
    const def = (x: unknown[]) => createKeyDef()(x);

    expect(testKeys._def).toStrictEqual(createGlobalKeyDef()(['test']));
    expect(testKeys.all).toStrictEqual(key(['test', 'all'], KeyType.Static));

    expect(testKeys.detail._def).toStrictEqual(def(['test', 'detail']));
    expect(testKeys.detail('string')).toStrictEqual(
      key(['test', 'detail', ['string']], KeyType.Dynamic),
    );

    expect(testKeys.list).toMatchObject(key(['test', 'list'], KeyType.Static));
    expect(testKeys.list.search._def).toStrictEqual(def(['test', 'list', 'search']));
    expect(testKeys.list.search({ lol: 'string' })).toStrictEqual(
      key(['test', 'list', 'search', [{ lol: 'string' }]], KeyType.Dynamic),
    );

    expect(testKeys.byId._def).toStrictEqual(def(['test', 'byId']));
    expect(testKeys.byId('string')).toMatchObject(
      key(['test', 'byId', ['string']], KeyType.Dynamic),
    );
    expect(testKeys.byId('string').likes).toStrictEqual(
      key(['test', 'byId', ['string'], 'likes'], KeyType.Static),
    );
  });
}
