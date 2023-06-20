export type Falsy = undefined | null | false;
export type NoInfer<T> = [T][T extends any ? 0 : never];
export type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
export type PickRequiredTuple<T extends any[]> = T extends [infer U, ...infer X]
  ? [U, ...PickRequiredTuple<X>]
  : [];

export type Expand<T> = T extends object
  ? T extends infer O
    ? { [K in keyof O]: O[K] }
    : never
  : T;

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * Noop function that is needed to satisfy TS in this scenario:
 *
 * ```ts
 * type A = deeply nested conditional type;
 * type B = Expand<A>;
 *
 * declare const a: A;
 * const b: B = a; // TS Error: Type `A` is not assignable to type `Expand<A>`
 *
 * ```
 */
export function expandType<T>(x: T): Expand<T> {
  return x as Expand<T>;
}

export type WrapArgInTuple<T> = T extends any[] ? T : [arg: T];

// TODO: Should we replace `ctx` with `meta` from react-query?
export type QueryContext<T> = T extends undefined ? { ctx?: T } : { ctx: T };
export type QueryArgs<T extends any[]> = PickRequiredTuple<T> extends []
  ? { args?: T }
  : { args: T };

export function todo(message?: string): never {
  throw new Error(message ?? '[TODO] Not implemented yet');
}
