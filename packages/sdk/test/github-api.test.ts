import { describe, test, expect, vi, beforeEach } from "vitest";
import { GitHubApiClient } from "../src/web/github-api";

describe("GitHub API Client", () => {
  let client: GitHubApiClient;
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new GitHubApiClient(
      "testowner",
      "testrepo",
      mockLogger as any,
      {}
    );
  });

  describe("downloadZipArchive", () => {
    test("should handle missing Content-Length header gracefully", async () => {
      // Mock fetch response without Content-Length header
      const mockResponse = {
        ok: true,
        headers: {
          get: (name: string) => (name === "content-length" ? null : null),
        },
        arrayBuffer: async () => new ArrayBuffer(1024),
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      // Should not throw error
      const result = await client.downloadZipArchive();

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(1024);

      // Should log warning
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Content-Length header")
      );
    });

    test("should log size when Content-Length header is present", async () => {
      // Mock fetch response with Content-Length header
      const mockResponse = {
        ok: true,
        headers: {
          get: (name: string) => (name === "content-length" ? "1048576" : null), // 1MB
        },
        arrayBuffer: async () => new ArrayBuffer(1_048_576),
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.downloadZipArchive();

      expect(result).toBeInstanceOf(Buffer);
      expect(mockLogger.info).toHaveBeenCalledWith("Archive size: 1.00 MB");
    });

    test("should throw error for failed requests", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: "Not Found",
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      await expect(client.downloadZipArchive()).rejects.toThrow(
        "Failed to download archive: 404 Not Found"
      );
    });
  });

  describe("checkAccess", () => {
    test("should return accessible for public repository", async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          default_branch: "main",
          size: 1000,
          private: false,
        }),
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.checkAccess();

      expect(result).toEqual({
        accessible: true,
        isPrivate: false,
        defaultBranch: "main",
      });
    });

    test("should handle 404 errors", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };

      globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

      const result = await client.checkAccess();

      expect(result).toEqual({
        accessible: false,
        isPrivate: true,
        defaultBranch: "main",
      });
    });
  });
});
