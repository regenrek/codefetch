import { join } from "node:path";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { mkdtemp } from "node:fs/promises";
import AdmZip from "adm-zip";
import type { ConsolaInstance } from "consola";
import type { ParsedURL } from "./url-handler.js";

interface GitHubRepo {
  default_branch: string;
  size: number;
  private: boolean;
}

interface GitHubApiOptions {
  token?: string;
  branch?: string;
}

export class GitHubApiClient {
  private baseUrl = "https://api.github.com";
  private headers: Record<string, string>;

  constructor(
    private owner: string,
    private repo: string,
    private logger: ConsolaInstance,
    private options: GitHubApiOptions = {}
  ) {
    this.headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Codefetch/1.0",
    };

    if (options.token) {
      this.headers.Authorization = `token ${options.token}`;
    }
  }

  /**
   * Check if the repository is accessible via API
   */
  async checkAccess(): Promise<{
    accessible: boolean;
    isPrivate: boolean;
    defaultBranch: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.owner}/${this.repo}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { accessible: false, isPrivate: true, defaultBranch: "main" };
        }
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = (await response.json()) as GitHubRepo;
      return {
        accessible: true,
        isPrivate: data.private,
        defaultBranch: data.default_branch,
      };
    } catch (error) {
      this.logger.debug(`Failed to check repository access: ${error}`);
      return { accessible: false, isPrivate: true, defaultBranch: "main" };
    }
  }

  /**
   * Download repository as ZIP archive
   */
  async downloadZipArchive(ref: string = "HEAD"): Promise<Buffer> {
    const branch = this.options.branch || ref;
    const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/zipball/${branch}`;

    this.logger.info(`Downloading repository archive...`);

    const response = await fetch(url, {
      headers: this.headers,
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to download archive: ${response.status} ${response.statusText}`
      );
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      const sizeMB = (Number.parseInt(contentLength) / 1024 / 1024).toFixed(2);
      this.logger.info(`Archive size: ${sizeMB} MB`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Download and extract repository to a directory
   */
  async downloadToDirectory(
    targetDir: string,
    options: {
      extensions?: string[];
      excludeDirs?: string[];
      maxFiles?: number;
    } = {}
  ): Promise<void> {
    // Download ZIP archive
    const zipBuffer = await this.downloadZipArchive(this.options.branch);

    // Create temporary file for ZIP
    const tempDir = await mkdtemp(join(tmpdir(), "codefetch-zip-"));
    const zipPath = join(tempDir, "repo.zip");
    await writeFile(zipPath, zipBuffer);

    this.logger.info("Extracting repository archive...");

    // Extract ZIP
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();

    // GitHub ZIP archives have a root directory like "owner-repo-commit/"
    // We need to strip this prefix
    let rootPrefix = "";
    if (entries.length > 0) {
      const firstEntry = entries[0].entryName;
      const match = firstEntry.match(/^[^/]+\//);
      if (match) {
        rootPrefix = match[0];
      }
    }

    // Create target directory
    await mkdir(targetDir, { recursive: true });

    // Process entries
    let extracted = 0;
    let skipped = 0;
    const defaultExcludeDirs = [
      ".git",
      "node_modules",
      "dist",
      "build",
      ".next",
      "coverage",
    ];
    const excludeDirs = [...(options.excludeDirs || []), ...defaultExcludeDirs];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      // Remove root prefix
      const relativePath = entry.entryName.startsWith(rootPrefix)
        ? entry.entryName.slice(rootPrefix.length)
        : entry.entryName;

      // Skip if no relative path (root directory entry)
      if (!relativePath) continue;

      // Check excluded directories
      const pathParts = relativePath.split("/");
      const isExcluded = excludeDirs.some((dir) => pathParts.includes(dir));
      if (isExcluded) {
        skipped++;
        continue;
      }

      // Check extensions
      if (options.extensions && options.extensions.length > 0) {
        const hasValidExt = options.extensions.some((ext) =>
          relativePath.endsWith(ext)
        );
        if (!hasValidExt) {
          skipped++;
          continue;
        }
      }

      // Check max files limit
      if (options.maxFiles && extracted >= options.maxFiles) {
        this.logger.warn(
          `Reached file limit (${options.maxFiles}), stopping extraction`
        );
        break;
      }

      try {
        const targetPath = join(targetDir, relativePath);
        const targetDirPath = join(
          targetDir,
          relativePath.slice(0, Math.max(0, relativePath.lastIndexOf("/")))
        );

        // Create directory structure
        await mkdir(targetDirPath, { recursive: true });

        // Extract file
        const buffer = zip.readFile(entry);
        if (!buffer) {
          throw new Error("Failed to read file from ZIP");
        }
        await writeFile(targetPath, buffer);
        extracted++;

        // Report progress periodically
        if (extracted % 50 === 0) {
          this.logger.info(`Extracted ${extracted} files...`);
        }
      } catch (error) {
        this.logger.debug(`Failed to extract ${relativePath}: ${error}`);
        skipped++;
      }
    }

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });

    this.logger.success(`Extracted ${extracted} files (skipped ${skipped})`);
  }
}

/**
 * Fetch GitHub repository using API
 */
export async function fetchGitHubViaApi(
  parsedUrl: ParsedURL,
  targetDir: string,
  logger: ConsolaInstance,
  options: {
    branch?: string;
    token?: string;
    extensions?: string[];
    excludeDirs?: string[];
    maxFiles?: number;
  } = {}
): Promise<boolean> {
  if (!parsedUrl.gitOwner || !parsedUrl.gitRepo) {
    logger.debug("Invalid GitHub URL - missing owner or repo");
    return false;
  }

  const client = new GitHubApiClient(
    parsedUrl.gitOwner,
    parsedUrl.gitRepo,
    logger,
    {
      token: options.token || process.env.GITHUB_TOKEN,
      branch: options.branch || parsedUrl.gitRef,
    }
  );

  // Check if we can access the repository
  const { accessible, isPrivate, defaultBranch } = await client.checkAccess();

  if (!accessible) {
    logger.debug(
      "Repository not accessible via API, falling back to git clone"
    );
    return false;
  }

  if (isPrivate && !options.token && !process.env.GITHUB_TOKEN) {
    logger.debug(
      "Private repository requires authentication, falling back to git clone"
    );
    return false;
  }

  try {
    // Use the branch from options, URL, or default branch
    const branch = options.branch || parsedUrl.gitRef || defaultBranch;
    (client as any).options.branch = branch;

    await client.downloadToDirectory(targetDir, {
      extensions: options.extensions,
      excludeDirs: options.excludeDirs || [
        "node_modules",
        ".git",
        "dist",
        "build",
      ],
      maxFiles: options.maxFiles || 1000,
    });

    return true;
  } catch (error) {
    console.error("GitHub API error:", error);
    logger.warn(`GitHub API fetch failed: ${error}`);
    logger.debug(`Full error:`, error);
    return false;
  }
}