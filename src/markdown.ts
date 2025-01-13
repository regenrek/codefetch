import fs from "node:fs";
import path from "node:path";
import consola from "consola";
import type { TokenEncoder } from "./types";
import { generateProjectTree } from "./tree";
import readline from "node:readline";

function logVerbose(message: string, level: number, currentVerbosity: number) {
  if (currentVerbosity >= level) {
    consola.log(message);
  }
}

export async function generateMarkdown(
  files: string[],
  options: {
    maxTokens: number | null;
    verbose: number;
    projectTree: number;
    tokenEncoder: TokenEncoder;
  }
): Promise<string> {
  const markdownContent: string[] = [];

  // Add project tree if level > 0
  if (options.projectTree > 0) {
    logVerbose("Writing project tree...", 2, options.verbose);
    markdownContent.push(
      "```",
      generateProjectTree(process.cwd(), options.projectTree),
      "```",
      ""
    );
  }

  // Process files
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    logVerbose(`${relativePath}`, 1, options.verbose);

    try {
      const stream = fs.createReadStream(file, { encoding: "utf8" });
      const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity,
      });

      markdownContent.push(relativePath, "```");

      let lineNumber = 1;
      for await (const line of rl) {
        markdownContent.push(`${lineNumber} | ${line}`);
        lineNumber++;
      }

      markdownContent.push("```", "");
    } catch (error_: unknown) {
      const errorMessage =
        error_ instanceof Error ? error_.message : String(error_);
      consola.warn(`Error processing file ${file}: ${errorMessage}`);
    }
  }

  return markdownContent.join("\n");
}
