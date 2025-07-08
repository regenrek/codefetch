import { createReadStream } from "node:fs";
import { relative } from "pathe";
import type { TokenEncoder, TokenLimiter } from "./types";
import { generateProjectTree } from "./tree";
import { countTokens } from "./token-counter";
import { processPromptTemplate, resolvePrompt } from "./template-parser";

const CHUNK_SIZE = 64 * 1024; // 64KB optimal chunk size

export interface MarkdownGeneratorOptions {
  maxTokens: number | null;
  verbose?: number;
  projectTree?: number;
  tokenEncoder: TokenEncoder;
  disableLineNumbers?: boolean;
  tokenLimiter?: TokenLimiter;
  promptFile?: string;
  templateVars?: Record<string, string>;
  onVerbose?: (message: string, level: number) => void;
}

async function readFileWithTokenLimit(
  file: string,
  tokenEncoder: TokenEncoder,
  remainingTokensRef: { value: number },
  disableLineNumbers: boolean,
  onVerbose?: (message: string, level: number) => void
): Promise<{ lines: string[]; finalLineNumber: number }> {
  const initialTokens = remainingTokensRef.value;
  const stream = createReadStream(file, {
    encoding: "utf8",
    highWaterMark: CHUNK_SIZE,
  });

  const outputLines: string[] = [];
  let buffer = "";
  let currentLineNo = 1;
  let isTruncated = false;

  // Calculate tokens for metadata first
  const relativeFilePath = relative(process.cwd(), file);
  const metadataTokens = await countTokens(
    `${relativeFilePath}\n\`\`\`\n\`\`\`\n`,
    tokenEncoder
  );
  const truncatedMarkerTokens = await countTokens(
    "[TRUNCATED]\n",
    tokenEncoder
  );

  // Reserve tokens for metadata
  remainingTokensRef.value -= metadataTokens;

  // Add filename and opening fence
  outputLines.push(relativeFilePath);
  outputLines.push("```");

  for await (const chunk of stream) {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const prefixedLine = disableLineNumbers
        ? line
        : `${currentLineNo} | ${line}`;

      const neededTokens = await countTokens(prefixedLine, tokenEncoder);

      // Check if we have enough tokens including potential truncated marker
      if (neededTokens > remainingTokensRef.value - truncatedMarkerTokens) {
        isTruncated = true;
        break;
      }

      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
      currentLineNo++;
    }

    if (isTruncated) break;
  }

  // Handle any remaining content in buffer if not truncated
  if (!isTruncated && buffer) {
    const prefixedLine = disableLineNumbers
      ? buffer
      : `${currentLineNo} | ${buffer}`;

    const neededTokens = await countTokens(prefixedLine, tokenEncoder);
    if (neededTokens <= remainingTokensRef.value - truncatedMarkerTokens) {
      outputLines.push(prefixedLine);
      remainingTokensRef.value -= neededTokens;
    } else {
      isTruncated = true;
    }
  }

  if (isTruncated) {
    outputLines.push("[TRUNCATED]");
    remainingTokensRef.value -= truncatedMarkerTokens;
  }
  outputLines.push("```\n");

  const tokensUsed = initialTokens - remainingTokensRef.value;
  onVerbose?.(
    `File ${file}: ${tokensUsed} tokens used, ${remainingTokensRef.value} remaining`,
    3
  );

  return { lines: outputLines, finalLineNumber: currentLineNo };
}

export async function generateMarkdown(
  files: string[],
  options: MarkdownGeneratorOptions
): Promise<string> {
  const {
    maxTokens,
    verbose: _verbose = 0,
    projectTree = 0,
    tokenEncoder,
    disableLineNumbers = false,
    tokenLimiter = "truncated",
    promptFile,
    templateVars,
    onVerbose,
  } = options;

  let promptTemplate = "";
  const markdownContent: string[] = [];
  const tokenCounter = {
    remaining: maxTokens ?? Number.MAX_SAFE_INTEGER,
    total: 0,
  };

  // Get the prompt template (not replacement yet)
  if (promptFile) {
    onVerbose?.("Writing prompt template...", 2);
    const resolvedPrompt = await resolvePrompt(promptFile);

    if (resolvedPrompt) {
      promptTemplate = resolvedPrompt;
      const promptTokens = await countTokens(promptTemplate, tokenEncoder);

      if (maxTokens && promptTokens > tokenCounter.remaining) {
        onVerbose?.(`Prompt exceeds token limit, skipping`, 3);
        return "";
      }
      const templateTokens = await countTokens(promptTemplate, tokenEncoder);
      tokenCounter.remaining -= templateTokens;
      tokenCounter.total += templateTokens;

      onVerbose?.(`Token used for prompt: ${templateTokens}`, 3);
    } else {
      onVerbose?.(`No prompt template found, skipping`, 1);
    }
  }

  onVerbose?.(`Initial token limit: ${tokenCounter.remaining}`, 3);

  // Handle project tree
  if (projectTree > 0) {
    onVerbose?.("Writing project tree...", 2);
    const tree = generateProjectTree(process.cwd(), projectTree);
    const treeTokens = await countTokens(tree, tokenEncoder);

    if (maxTokens && treeTokens > tokenCounter.remaining) {
      onVerbose?.(`Tree exceeds token limit, skipping`, 3);
      return "";
    }

    markdownContent.push(tree, "");
    tokenCounter.remaining -= treeTokens;
    tokenCounter.total += treeTokens;
    onVerbose?.(`Tokens used for tree: ${treeTokens}`, 3);
  }

  if (tokenLimiter === "truncated" && maxTokens) {
    // Calculate tokens per file to distribute evenly
    const tokensPerFile = Math.floor(tokenCounter.remaining / files.length);
    onVerbose?.(`Distributing ${tokensPerFile} tokens per file`, 3);

    for (const file of files) {
      const { lines: fileLines } = await readFileWithTokenLimit(
        file,
        tokenEncoder,
        { value: tokensPerFile },
        disableLineNumbers,
        onVerbose
      );

      markdownContent.push(...fileLines);
      const fileTokens = await countTokens(fileLines.join("\n"), tokenEncoder);
      tokenCounter.total += fileTokens;
      tokenCounter.remaining = Math.max(0, tokenCounter.remaining - fileTokens);
    }
  } else {
    // Sequential mode - process files until total token limit is reached
    for (const file of files) {
      if (maxTokens && tokenCounter.total >= maxTokens) {
        onVerbose?.(
          `Total token limit reached (${tokenCounter.total}/${maxTokens})`,
          2
        );
        break;
      }

      const { lines: fileLines } = await readFileWithTokenLimit(
        file,
        tokenEncoder,
        {
          value: maxTokens
            ? maxTokens - tokenCounter.total
            : Number.MAX_SAFE_INTEGER,
        },
        disableLineNumbers,
        onVerbose
      );

      const fileContent = fileLines.join("\n");
      const fileTokens = await countTokens(fileContent, tokenEncoder);

      // In sequential mode, we only add the file if it fits within remaining tokens
      if (maxTokens && tokenCounter.total + fileTokens > maxTokens) {
        onVerbose?.(
          `Adding file would exceed token limit, skipping: ${file}`,
          2
        );
        continue;
      }

      markdownContent.push(...fileLines);
      tokenCounter.total += fileTokens;
      tokenCounter.remaining = maxTokens
        ? maxTokens - tokenCounter.total
        : Number.MAX_SAFE_INTEGER;
    }
  }

  onVerbose?.(`Final token count: ${tokenCounter.total}`, 2);

  // Before final return, if we have a template with {{files}}, replace it
  const content = markdownContent.join("\n");
  return !promptFile || promptTemplate === ""
    ? content
    : processPromptTemplate(promptTemplate, content, templateVars ?? {});
}

// Re-export for backward compatibility
export { readFileWithTokenLimit };
