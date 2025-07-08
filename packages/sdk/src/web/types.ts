export interface WebFetchConfig {
  url: string;
  cacheTTL?: number;
  branch?: string;
  noCache?: boolean;
  noApi?: boolean;
  githubToken?: string;
}

export interface GitCloneOptions {
  branch?: string;
  depth?: number;
  singleBranch?: boolean;
}

export interface CrawlOptions {
  maxDepth?: number;
  maxPages?: number;
  ignoreRobots?: boolean;
  ignoreCors?: boolean;
  followRedirects?: boolean;
  userAgent?: string;
}

export interface CrawlResult {
  url: string;
  content: string;
  links: string[];
  depth: number;
  error?: string;
}
