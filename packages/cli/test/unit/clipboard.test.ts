import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { copyToClipboard } from "../../src/utils/clipboard";
import { spawn } from "node:child_process";

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

const spawnMock = vi.mocked(spawn);

type ClipboardChild = {
  on: ReturnType<typeof vi.fn>;
  stderr: { on: ReturnType<typeof vi.fn> };
  stdin: {
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
  };
  emit: (event: string, value: number | Error) => void;
  emitStderr: (data: string) => void;
};

function createClipboardChild(): ClipboardChild {
  const events = new Map<string, (value: any) => void>();
  const stderrEvents = new Map<string, (value: any) => void>();
  return {
    on: vi.fn((event: string, handler: (value: any) => void) => {
      events.set(event, handler);
    }),
    stderr: {
      on: vi.fn((event: string, handler: (value: any) => void) => {
        stderrEvents.set(event, handler);
      }),
    },
    stdin: {
      write: vi.fn((_text: string, cb?: (err?: Error | null) => void) => {
        cb?.(null);
      }),
      end: vi.fn(),
    },
    emit: (event: string, value: number | Error) => {
      const handler = events.get(event);
      if (handler) handler(value);
    },
    emitStderr: (data: string) => {
      const handler = stderrEvents.get("data");
      if (handler) handler(Buffer.from(data));
    },
  };
}

let platformSpy: ReturnType<typeof vi.spyOn>;
let children: ClipboardChild[] = [];

beforeEach(() => {
  children = [];
  spawnMock.mockImplementation(() => {
    const child = createClipboardChild();
    children.push(child);
    return child as any;
  });
  platformSpy = vi.spyOn(process, "platform", "get");
});

afterEach(() => {
  platformSpy.mockRestore();
  spawnMock.mockReset();
});

describe("clipboard utils", () => {
  it("should use pbcopy on macOS", async () => {
    platformSpy.mockReturnValue("darwin");

    const promise = copyToClipboard("hello world");
    const child = children[0];
    child.emit("close", 0);
    await promise;

    expect(spawnMock).toHaveBeenCalledWith(
      "pbcopy",
      [],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
    expect(child.stdin.write).toHaveBeenCalledWith(
      "hello world",
      expect.any(Function)
    );
  });

  it("should use PowerShell on Windows", async () => {
    platformSpy.mockReturnValue("win32");

    const promise = copyToClipboard("win text");
    const child = children[0];
    child.emit("close", 0);
    await promise;

    expect(spawnMock).toHaveBeenCalledWith(
      "powershell",
      ["-NoProfile", "-Command", "Set-Clipboard", "-Value", "$input"],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
  });

  it("should fall back to xsel when xclip fails on Linux", async () => {
    platformSpy.mockReturnValue("linux");

    const promise = copyToClipboard("linux text");
    const first = children[0];
    first.emit("close", 1); // xclip fails

    await Promise.resolve();
    expect(children.length).toBeGreaterThanOrEqual(2);
    const second = children[1];
    second.emit("close", 0); // xsel succeeds

    await promise;
    expect(spawnMock).toHaveBeenNthCalledWith(
      1,
      "xclip",
      ["-selection", "clipboard"],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
    expect(spawnMock).toHaveBeenNthCalledWith(
      2,
      "xsel",
      ["--clipboard", "--input"],
      expect.objectContaining({
        stdio: ["pipe", "pipe", "pipe"],
      })
    );
  });

  it("should throw helpful error when both xclip and xsel fail", async () => {
    platformSpy.mockReturnValue("linux");

    const promise = copyToClipboard("linux fail");
    const first = children[0];
    first.emit("close", 1);

    await Promise.resolve();
    const second = children[1];
    second.emit("close", 1);

    await expect(promise).rejects.toThrow(
      "Clipboard copy failed. On Linux, please install xclip or xsel"
    );
  });
});
