import consola from "consola";
import {
  generateMarkdown as generateMarkdownSdk,
  type MarkdownGeneratorOptions,
} from "codefetch-sdk";

export async function generateMarkdown(
  files: string[],
  options: {
    maxTokens: number | null;
    verbose: number;
    projectTree: number;
    tokenEncoder: MarkdownGeneratorOptions["tokenEncoder"];
    disableLineNumbers?: boolean;
    tokenLimiter?: MarkdownGeneratorOptions["tokenLimiter"];
    promptFile?: string;
    inlinePrompt?: string;
    templateVars?: Record<string, string>;
    projectTreeBaseDir?: string;
    projectTreeSkipIgnoreFiles?: boolean;
  }
): Promise<string> {
  const sdkOptions: MarkdownGeneratorOptions = {
    ...options,
    onVerbose: (message: string, level: number) => {
      if (options.verbose >= level) {
        consola.log(message);
      }
    },
  };

  return generateMarkdownSdk(files, sdkOptions);
}
