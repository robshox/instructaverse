/**
 * Create a value on first property access. Lets modules export ready-to-use
 * singletons (database, auth) without doing I/O or reading secrets at import
 * time — `next build` imports every route module but has no runtime config.
 */
export function lazy<T extends object>(create: () => T): T {
  let instance: T | undefined;
  const real = () => (instance ??= create());
  return new Proxy({} as T, {
    get(_target, prop) {
      const target = real();
      const value = Reflect.get(target, prop, target);
      return typeof value === "function" ? value.bind(target) : value;
    },
    has(_target, prop) {
      return Reflect.has(real(), prop);
    },
  });
}
