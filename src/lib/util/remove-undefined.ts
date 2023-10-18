export default <T extends { [k: string]: unknown }>(obj: T): Exclude<T, undefined> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)) as Exclude<
    T,
    undefined
  >;
