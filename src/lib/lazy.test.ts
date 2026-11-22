import { describe, expect, it, vi } from "vitest";
import { lazy } from "@/lib/lazy";

describe("lazy", () => {
  it("doesn't create the value until it's used", () => {
    const create = vi.fn(() => ({ greet: () => "hi" }));
    const value = lazy(create);
    expect(create).not.toHaveBeenCalled();
    expect(value.greet()).toBe("hi");
    expect(create).toHaveBeenCalledOnce();
  });

  it("supports `in` checks (Better Auth's Next.js handler relies on them)", () => {
    const value = lazy(() => ({ handler: () => "ok" }));
    expect("handler" in value).toBe(true);
    expect("missing" in value).toBe(false);
  });

  it("keeps `this` bound to the real instance", () => {
    class Counter {
      n = 1;
      next() {
        return ++this.n;
      }
    }
    expect(lazy(() => new Counter()).next()).toBe(2);
  });
});
