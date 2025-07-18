export type TokenEncoder = "simple" | "p50k" | "o200k" | "cl100k";
export type TokenLimiter = "sequential" | "truncated";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  content?: string; // Only for files
  language?: string; // Detected language
  size?: number; // File size in bytes
  tokens?: number; // Token count
  lastModified?: Date;
  children?: FileNode[]; // Only for directories
}

export interface PerformanceMetrics {
  fetchDuration: number;
  parseFiles: number;
  tokenCountDuration: number;
  totalDuration: number;
  memoryUsed?: number;
}

export interface FetchMetadata {
  totalFiles: number;
  totalSize: number;
  totalTokens: number;
  fetchedAt: Date;
  source: string; // URL or local path
  gitProvider?: string;
  gitOwner?: string;
  gitRepo?: string;
  gitRef?: string;
  metrics?: PerformanceMetrics;
}

export interface FetchResult {
  root: FileNode;
  metadata: FetchMetadata;
}

export type OutputFormat = "markdown" | "json";
