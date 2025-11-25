import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildChatUrl, openBrowser } from "../../src/utils/browser";
import { spawn } from "node:child_process";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);

type BrowserChild = {
  on: ReturnType<typeof vi.fn>;
  unref: ReturnType<typeof vi.fn>;
  emitError: (error: Error) => void;
};

function createBrowserChild(): BrowserChild {
  const events = new Map<string, (...args: any[]) => void>();
  return {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      events.set(event, handler);
    }),
    unref: vi.fn(),
    emitError: (error: Error) => {
      const handler = events.get("error");
      if (handler) handler(error);
    },
  };
}

let platformSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  spawnMock.mockReset();
  platformSpy = vi.spyOn(process, "platform", "get");
});

afterEach(() => {
  vi.useRealTimers();
  platformSpy.mockRestore();
});

describe("browser utils", () => {
  describe("buildChatUrl", () => {
    it("should build URL with model parameter (no protocol)", () => {
      const url = buildChatUrl("chatgpt.com", "gpt-5-1-pro");
      expect(url).toBe("chatgpt.com/?model=gpt-5-1-pro");
    });

    it("should build URL with model and prompt parameters", () => {
      const url = buildChatUrl("chatgpt.com", "gpt-5-1-pro", "test prompt");
      expect(url).toBe("chatgpt.com/?model=gpt-5-1-pro&prompt=test+prompt");
    });

    it("should preserve http:// if provided", () => {
      const url = buildChatUrl("http://localhost:3000", "test-model");
      expect(url).toBe("http://localhost:3000/?model=test-model");
    });

    it("should preserve https:// if provided", () => {
      const url = buildChatUrl("https://api.openai.com", "gpt-4");
      expect(url).toBe("https://api.openai.com/?model=gpt-4");
    });

    it("should remove trailing slashes before adding params", () => {
      const url = buildChatUrl("chatgpt.com/", "gpt-4");
      expect(url).toBe("chatgpt.com/?model=gpt-4");
    });

    it("should handle URLs with existing paths", () => {
      const url = buildChatUrl("example.com/chat", "model-x");
      expect(url).toBe("example.com/chat?model=model-x");
    });

    it("should handle URLs with existing query params", () => {
      const url = buildChatUrl("example.com?foo=bar", "model-x");
      expect(url).toBe("example.com/?foo=bar&model=model-x");
    });

    it("should encode special characters in model name", () => {
      const url = buildChatUrl("chatgpt.com", "model with spaces");
      expect(url).toBe("chatgpt.com/?model=model+with+spaces");
    });

    it("should encode special characters in prompt", () => {
      const url = buildChatUrl(
        "chatgpt.com",
        "gpt-4",
        "prompt with & special chars"
      );
      expect(url).toBe(
        "chatgpt.com/?model=gpt-4&prompt=prompt+with+%26+special+chars"
      );
    });
  });

  describe("openBrowser", () => {
    it("should use macOS open command and add https:// if missing", async () => {
      platformSpy.mockReturnValue("darwin");
      const child = createBrowserChild();
      spawnMock.mockReturnValue(child as any);

      const promise = openBrowser("example.com");
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(spawnMock).toHaveBeenCalledWith(
        "open",
        ["https://example.com"],
        expect.objectContaining({ stdio: "ignore", detached: true })
      );
      expect(child.unref).toHaveBeenCalled();
    });

    it("should preserve https:// if already present", async () => {
      platformSpy.mockReturnValue("darwin");
      const child = createBrowserChild();
      spawnMock.mockReturnValue(child as any);

      const promise = openBrowser("https://example.com");
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(spawnMock).toHaveBeenCalledWith(
        "open",
        ["https://example.com"],
        expect.objectContaining({ stdio: "ignore", detached: true })
      );
    });

    it("should use Windows start command and add https:// if missing", async () => {
      platformSpy.mockReturnValue("win32");
      const child = createBrowserChild();
      spawnMock.mockReturnValue(child as any);

      const promise = openBrowser("example.com");
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(spawnMock).toHaveBeenCalledWith(
        "cmd",
        ["/c", "start", "", "https://example.com"],
        expect.objectContaining({ stdio: "ignore", detached: true })
      );
    });

    it("should use xdg-open on Linux and add https:// if missing", async () => {
      platformSpy.mockReturnValue("linux");
      const child = createBrowserChild();
      spawnMock.mockReturnValue(child as any);

      const promise = openBrowser("example.com");
      await vi.advanceTimersByTimeAsync(150);
      await promise;

      expect(spawnMock).toHaveBeenCalledWith(
        "xdg-open",
        ["https://example.com"],
        expect.objectContaining({ stdio: "ignore", detached: true })
      );
    });

    it("should surface helpful error on Linux when open fails", async () => {
      platformSpy.mockReturnValue("linux");
      const child = createBrowserChild();
      spawnMock.mockReturnValue(child as any);

      const promise = openBrowser("example.com");
      const error = new Error("xdg missing");
      child.emitError(error);

      await expect(promise).rejects.toThrow(
        "Could not open browser. On Linux, please install xdg-utils"
      );
    });
  });
});
