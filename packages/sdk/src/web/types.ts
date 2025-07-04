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

