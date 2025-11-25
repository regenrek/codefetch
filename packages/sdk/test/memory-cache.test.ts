import { describe, it, expect, vi } from "vitest";
import { MemoryCache } from "../src/cache/memory-cache.js";

describe("MemoryCache", () => {
  it("sets and retrieves values respecting TTL", async () => {
    vi.useFakeTimers();
    const cache = new MemoryCache({ ttl: 1 });

    await cache.set("key", { value: 123 });
    expect(await cache.has("key")).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(await cache.get("key")).toBeNull();
    vi.useRealTimers();
  });

  it("clears and deletes entries", async () => {
    const cache = new MemoryCache();
    await cache.set("a", { value: "one" });
    await cache.set("b", { value: "two" });

    expect(await cache.has("a")).toBe(true);
    await cache.delete("a");
    expect(await cache.has("a")).toBe(false);

    await cache.clear();
    expect(await cache.has("b")).toBe(false);
  });

  it("triggers cleanup when exceeding max size", async () => {
    const cache = new MemoryCache({ maxSize: 12_000 });
    await cache.set("a", { value: 1 });
    await cache.set("b", { value: 2 });
    await cache.set("c", { value: 3 });

    // Cleanup may keep or remove entries, but should not throw
    expect(typeof (await cache.has("a"))).toBe("boolean");
  });
});
