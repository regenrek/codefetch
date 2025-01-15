import { createReadStream } from "node:fs";
import { relative } from "pathe";
import type { TokenEncoder } from "./types";
import { generateProjectTree } from "./tree";
import { countTokens } from "./token-counter";
import consola from "consola";

const CHUNK_SIZE = 64 * 1024; // 64KB optimal chunk size

function logVerbose(message: string, level: number, currentVerbosity: number) {
  if (currentVerbosity >= level) {
    consola.log(message);
  }
}

async function readFileWithTokenLimit(
  file: string,
  tokenEncoder: TokenEncoder,
  remainingTokensRef: { value: number },
  verbose: number,
  disableLineNumbers: boolean
): Promise<{ lines: string[]; finalLineNumber: number }> {
  const stream = createReadStream(file, {
    encoding: "utf8",
    highWaterMark: CHUNK_SIZE,
  });

  const outputLines: string[] = [];
  let buffer = "";
  let currentLineNo = 1;

  // Add filename at the beginning
  const relativeFilePath = relative(process.cwd(), file);
  outputLines.push(relativeFilePath);
  outputLines.push("```");

  for await (const chunk of stream) {
    buffer += chunk;
    const lines = buffer.split("\n");

    // Keep last partial line in buffer
    buffer = lines.pop() || "";

    for (const line of lines) {
      const prefixedLine = disableLineNumbers
        ? line
        : `${currentLineNo} | ${line}`;

      const neededTokens = await countTokens(prefixedLine, tokenEncoder);

      if (neededTokens > remainingTokensRef.value) {
        outputLines.push("[TRUNCATED]");
        remainingTokensRef.value = 0;
        return { lines: outputLines, finalLineNumber: currentLineNo };
      }

      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
      currentLineNo++;
    }
  }

  // Handle any remaining content in buffer
  if (buffer) {
    const prefixedLine = disableLineNumbers
      ? buffer
      : `${currentLineNo} | ${buffer}`;

    const neededTokens = await countTokens(prefixedLine, tokenEncoder);
    if (neededTokens <= remainingTokensRef.value) {
      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
    } else {
      outputLines.push("[TRUNCATED]");
      remainingTokensRef.value = 0;
    }
  }

  // Add closing fence after all content
  outputLines.push("```\n");

  return { lines: outputLines, finalLineNumber: currentLineNo };
}

export async function generateMarkdown(
  files: string[],
  options: {
    maxTokens: number | null;
    verbose: number;
    projectTree: number;
    tokenEncoder: TokenEncoder;
    disableLineNumbers?: boolean;
  }
): Promise<string> {
  const { maxTokens, verbose, projectTree, tokenEncoder, disableLineNumbers } =
    options;
  const markdownContent: string[] = [];
  let remainingTokens = maxTokens ?? Number.MAX_SAFE_INTEGER;

  logVerbose(`Initial token limit: ${remainingTokens}`, 3, verbose);

  if (projectTree > 0) {
    logVerbose("Writing project tree...", 2, verbose);
    const tree = generateProjectTree(process.cwd(), projectTree);
    const treeTokens = await countTokens(tree, tokenEncoder);
    markdownContent.push(tree, "");
    remainingTokens -= treeTokens;
    logVerbose(`Tokens used for tree: ${treeTokens}`, 3, verbose);
  }

  for (const file of files) {
    if (remainingTokens <= 0) break;

    const relativePath = relative(process.cwd(), file);
    const { lines: fileLines } = await readFileWithTokenLimit(
      file,
      tokenEncoder,
      { value: remainingTokens },
      verbose,
      disableLineNumbers ?? false
    );

    markdownContent.push(...fileLines);
  }

  return markdownContent.join("\n");
}
