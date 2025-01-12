export interface ParsedArgs {
  output: string | null;
  maxTokens: number | null;
  extensions: string[] | null;
  verbose: number;
  includeFiles: string[] | null;
  excludeFiles: string[] | null;
  includeDirs: string[] | null;
  excludeDirs: string[] | null;
  treeLevel: number | null;
}
