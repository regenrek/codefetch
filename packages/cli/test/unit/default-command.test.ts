import { beforeEach, afterEach, describe, expect, test, vi } from "vitest";
import { mkdtemp, writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";

// Mocks for codefetch-sdk (used heavily by the default command)
const sdkMocks = vi.hoisted(() => ({
  collectFiles: vi.fn(),
  generateMarkdown: vi.fn(),
  countTokens: vi.fn(),
  collectFilesAsTree: vi.fn(),
  findProjectRoot: vi.fn(),
  fetch: vi.fn(),
  createCache: vi.fn(),
  DEFAULT_IGNORE_PATTERNS: "# node_modules\n.git\n",
  VALID_PROMPTS: new Set(["default.md", "fix", "improve"]),
  FetchResultImpl: class FetchResultImpl {
    root: any;
    metadata: any;
    constructor(root: any, metadata: any) {
      this.root = root;
      this.metadata = metadata;
    }
  },
}));

vi.mock("codefetch-sdk", () => sdkMocks);

let parseArgsMock: ReturnType<typeof vi.fn>;
let loadConfigMock: ReturnType<typeof vi.fn>;
let printHelpMock: ReturnType<typeof vi.fn>;

vi.mock("../../src/index", () => ({
  parseArgs: (...args: any[]) => parseArgsMock(...args),
  loadCodefetchConfig: (...args: any[]) => loadConfigMock(...args),
  printHelp: (...args: any[]) => printHelpMock(...args),
}));

// Import after mocks are registered
import defaultMain from "../../src/commands/default";

describe("default command", () => {
  let tempDir: string;
  const originalCwd = process.cwd();

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "codefetch-cli-default-"));

    parseArgsMock = vi.fn();
    loadConfigMock = vi.fn();
    printHelpMock = vi.fn();

    sdkMocks.collectFiles.mockReset();
    sdkMocks.generateMarkdown.mockReset();
    sdkMocks.countTokens.mockReset();
    sdkMocks.collectFilesAsTree.mockReset();
    sdkMocks.findProjectRoot.mockReset();
    sdkMocks.fetch.mockReset();
    sdkMocks.createCache.mockReset();

    sdkMocks.findProjectRoot.mockImplementation((dir: string) => dir);
    sdkMocks.countTokens.mockResolvedValue(7);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test("writes markdown output for a local directory", async () => {
    const filePath = join(tempDir, "src", "index.ts");
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(filePath, "export const a = 1;");

    const files = [filePath];

    parseArgsMock.mockReturnValue({
      url: undefined,
      verbose: 1,
      dryRun: false,
    });

    loadConfigMock.mockResolvedValue({
      format: "markdown",
      verbose: 1,
      extensions: [],
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      maxTokens: null,
      tokenEncoder: "cl100k",
      tokenLimiter: "truncated",
      defaultPromptFile: "default.md",
      outputPath: join(tempDir, "out"),
      outputFile: "SUMMARY.md",
      projectTree: 1,
      templateVars: {},
      projectTreeSkipIgnoreFiles: false,
      tokenCountOnly: false,
      noSummary: false,
      trackedModels: [],
    });

    sdkMocks.collectFiles.mockResolvedValue(files);
    sdkMocks.generateMarkdown.mockResolvedValue("MOCK_MARKDOWN");

    await defaultMain({
      _: [tempDir],
      help: false,
      h: false,
      "skip-root-check": true,
    } as any);

    const outputPath = join(tempDir, "out", "SUMMARY.md");
    const output = await readFile(outputPath, "utf8");

    expect(output).toBe("MOCK_MARKDOWN");
    expect(sdkMocks.generateMarkdown).toHaveBeenCalledWith(
      files,
      expect.objectContaining({ projectTree: 1 })
    );
  });

  test("writes JSON output when format is json", async () => {
    const filePath = join(tempDir, "src", "index.ts");
    await mkdir(join(tempDir, "src"), { recursive: true });
    await writeFile(filePath, "export const a = 1;");

    const files = [filePath];

    parseArgsMock.mockReturnValue({
      url: undefined,
      verbose: 1,
      dryRun: false,
    });

    loadConfigMock.mockResolvedValue({
      format: "json",
      verbose: 1,
      outputPath: join(tempDir, "out"),
      outputFile: "SUMMARY.md",
      projectTree: 0,
      templateVars: {},
      projectTreeSkipIgnoreFiles: false,
      tokenCountOnly: false,
      noSummary: false,
      trackedModels: ["gpt-4o-mini"],
    });

    sdkMocks.collectFiles.mockResolvedValue(files);
    sdkMocks.collectFilesAsTree.mockResolvedValue({
      root: { path: "/" },
      totalSize: 10,
      totalTokens: 5,
    });

    await defaultMain({
      _: [tempDir],
      help: false,
      h: false,
      "skip-root-check": true,
    } as any);

    const jsonPath = join(tempDir, "out", "SUMMARY.json");
    const json = JSON.parse(await readFile(jsonPath, "utf8"));

    expect(json.metadata.totalFiles).toBe(1);
    expect(json.metadata.totalTokens).toBe(5);
  });

  test("supports token-count-only mode", async () => {
    parseArgsMock.mockReturnValue({
      url: undefined,
      verbose: 2,
      dryRun: false,
    });

    loadConfigMock.mockResolvedValue({
      format: "markdown",
      verbose: 2,
      extensions: [],
      excludeFiles: null,
      includeFiles: null,
      excludeDirs: null,
      includeDirs: null,
      maxTokens: 10,
      tokenEncoder: "cl100k",
      tokenLimiter: "truncated",
      defaultPromptFile: "default.md",
      outputPath: join(tempDir, "out"),
      outputFile: "SUMMARY.md",
      projectTree: 0,
      templateVars: {},
      projectTreeSkipIgnoreFiles: false,
      tokenCountOnly: true,
      noSummary: true,
      trackedModels: [],
    });

    sdkMocks.collectFiles.mockResolvedValue([join(tempDir, "file.ts")]);
    sdkMocks.generateMarkdown.mockResolvedValue("MARKDOWN");
    sdkMocks.countTokens.mockResolvedValue(42);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await defaultMain({
      _: [tempDir],
      help: false,
      h: false,
      "skip-root-check": true,
    } as any);

    expect(logSpy).toHaveBeenCalledWith(42);
    expect(existsSync(join(tempDir, "out", "SUMMARY.md"))).toBe(false);
  });

  test("handles URL mode and dry run output", async () => {
    parseArgsMock.mockReturnValue({
      url: "https://example.com/repo",
      verbose: 3,
      dryRun: true,
      cacheTTL: 1,
      maxDepth: undefined,
      maxPages: undefined,
    });

    loadConfigMock.mockResolvedValue({
      format: "json",
      verbose: 2,
      outputPath: join(tempDir, "out"),
      outputFile: "result.md",
      projectTree: 0,
      templateVars: {},
      projectTreeSkipIgnoreFiles: false,
      tokenCountOnly: false,
      noSummary: false,
      trackedModels: [],
    });

    sdkMocks.fetch.mockResolvedValue({
      metadata: { totalTokens: 12 },
      data: "payload",
    });

    sdkMocks.createCache.mockResolvedValue({
      getStats: vi.fn(async () => ({ entryCount: 1, sizeMB: 1.5 })),
    });

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await defaultMain({
      _: [],
      help: false,
      h: false,
    } as any);

    expect(sdkMocks.fetch).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
  });
});
