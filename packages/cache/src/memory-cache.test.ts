import { describe, expect, it } from "vitest";

import { MemoryCacheStore } from "./memory-cache.js";

describe("MemoryCacheStore", () => {
  it("değerleri saklar ve döndürür", async () => {
    const cache = new MemoryCacheStore();

    await cache.set("anahtar", { value: 42 }, 1000);

    expect(await cache.get("anahtar")).toEqual({ value: 42 });
  });

  it("TTL süresi dolunca değeri siler", async () => {
    let now = 0;
    const cache = new MemoryCacheStore({ now: () => now });

    await cache.set("anahtar", "değer", 100);

    now = 99;
    expect(await cache.get("anahtar")).toBe("değer");

    now = 100;
    expect(await cache.get("anahtar")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("maxEntries aşıldığında en eski girdiyi atar", async () => {
    const cache = new MemoryCacheStore({ maxEntries: 2 });

    await cache.set("a", 1, 1000);
    await cache.set("b", 2, 1000);
    await cache.set("c", 3, 1000);

    expect(await cache.get("a")).toBeUndefined();
    expect(await cache.get("b")).toBe(2);
    expect(await cache.get("c")).toBe(3);
  });

  it("delete ve clear çalışır", async () => {
    const cache = new MemoryCacheStore();

    await cache.set("a", 1, 1000);
    await cache.set("b", 2, 1000);

    await cache.delete("a");
    expect(await cache.get("a")).toBeUndefined();

    await cache.clear();
    expect(await cache.get("b")).toBeUndefined();
    expect(cache.size()).toBe(0);
  });

  it("sıfır veya negatif TTL ile değer saklamaz", async () => {
    const cache = new MemoryCacheStore();

    await cache.set("a", 1, 0);

    expect(await cache.get("a")).toBeUndefined();
  });
});
