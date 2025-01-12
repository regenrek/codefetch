export interface ParsedArgs {
  output: string | undefined;
  maxTokens: number | undefined;
  extensions: string[] | undefined;
  verbose: number;
  includeFiles: string[] | undefined;
  excludeFiles: string[] | undefined;
  includeDirs: string[] | undefined;
  excludeDirs: string[] | undefined;
  projectTree: number | undefined;
  help: boolean;
}
