export type NoInfer<T> = [T][T extends any ? 0 : never];
export type PickRequired<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
};
export type PickRequiredTuple<T extends any[]> = T extends [infer U, ...infer X]
  ? [U, ...PickRequiredTuple<X>]
  : [];
