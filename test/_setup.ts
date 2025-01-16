export { afterEach, describe, it, expect, vi } from "vitest";
import { consola } from "consola";
import { beforeAll, beforeEach, vi } from "vitest";

beforeAll(() => {
  // if we enabled this stdout is empty and console.log fail
  // Not sure how to mock the consola - docs aren't helping here.
  // would be much easier...
  //consola.wrapAll();
});

beforeEach(() => {
  consola.mockTypes(() => vi.fn());
});
