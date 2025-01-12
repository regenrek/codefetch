export interface ParsedArgs {
  output: string | null;
  maxTokens: number | null;
  extensions: string[] | null;
  verbose: boolean;
  includeFiles: string[] | null;
  excludeFiles: string[] | null;
  includeDirs: string[] | null;
  excludeDirs: string[] | null;
  treeLevel: number | null;
}
