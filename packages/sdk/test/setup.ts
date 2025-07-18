import { beforeAll, afterEach, afterAll } from "vitest";
import { server } from "./mocks/server.js";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());
