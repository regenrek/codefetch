export interface WebFetchConfig {
  url: string;
  cacheTTL?: number;
  maxDepth?: number;
  maxPages?: number;
  branch?: string;
  noCache?: boolean;
  ignoreRobots?: boolean;
  ignoreCors?: boolean;
  noApi?: boolean;
  githubToken?: string;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  ignoreRobots?: boolean;
  followRedirects?: boolean;
  userAgent?: string;
  timeout?: number;
  concurrency?: number;
}

export interface CrawlResult {
  url: string;
  content: string;
  contentType: string;
  statusCode: number;
  headers: Record<string, string>;
  links: string[];
  codeBlocks: CodeBlock[];
}

export interface CodeBlock {
  language?: string;
  content: string;
  startLine?: number;
  endLine?: number;
}

export interface GitCloneOptions {
  branch?: string;
  depth?: number;
  singleBranch?: boolean;
}

export interface WebContent {
  type: "file" | "directory";
  path: string;
  content?: string;
  children?: WebContent[];
  metadata?: {
    url?: string;
    fetchedAt?: string;
    contentType?: string;
  };
}
