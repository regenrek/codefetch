export { afterEach, describe, it, expect, vi } from "vitest";
import { consola } from "consola";
import { beforeAll, beforeEach, afterAll, vi } from "vitest";
import { server } from "./mocks/server.js";

beforeAll(() => {
  // Start MSW server for mocking HTTP requests
  server.listen({ onUnhandledRequest: "error" });

  // if we enabled this stdout is empty and console.log fail
  // Not sure how to mock the consola - docs aren't helping here.
  // would be much easier...
  //consola.wrapAll();
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  consola.mockTypes(() => vi.fn());
});
