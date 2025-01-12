import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Writable } from "node:stream";

function estimateTokens(text: string): number {
  return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
}

function logVerbose(message: string, level: number, currentVerbosity: number) {
  if (currentVerbosity >= level) {
    console.log(message);
  }
}

export async function generateMarkdown(
  files: string[],
  options: {
    outputPath: string | null;
    maxTokens: number | null;
    verbose: number;
    projectTree?: string;
  }
): Promise<number> {
  let totalTokens = 0;

  // Create output directory if needed
  if (options.outputPath) {
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      logVerbose(`Created output directory: ${outputDir}`, 2, options.verbose);
    }
  }

  // Type-safe write function
  const writeToOutput = (
    output: Writable | typeof process.stdout,
    text: string
  ) => {
    if (output instanceof Writable) {
      output.write(text);
    } else {
      output.write(text);
    }
  };

  const output = options.outputPath
    ? fs.createWriteStream(options.outputPath)
    : process.stdout;

  // Write project tree if available
  if (options.projectTree) {
    logVerbose("Writing project tree...", 2, options.verbose);
    writeToOutput(output, "```\n");
    writeToOutput(output, options.projectTree);
    writeToOutput(output, "```\n\n");
    totalTokens += estimateTokens(options.projectTree);
    logVerbose(
      `Project tree tokens: ${estimateTokens(options.projectTree)}`,
      2,
      options.verbose
    );
  }

  // Write files
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    logVerbose(`Processing file: ${relativePath}`, 1, options.verbose);

    const fileStream = fs.createReadStream(file, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    writeToOutput(output, `${relativePath}\n`);
    writeToOutput(output, "```\n");

    let lineNumber = 1;
    let fileTokens = 0;

    for await (const line of rl) {
      const lineTokens = estimateTokens(line);
      if (options.maxTokens && totalTokens + lineTokens > options.maxTokens) {
        logVerbose(
          `Max tokens reached (${totalTokens}/${options.maxTokens})`,
          1,
          options.verbose
        );
        break;
      }

      writeToOutput(output, `${lineNumber} | ${line}\n`);
      totalTokens += lineTokens;
      fileTokens += lineTokens;
      lineNumber++;
    }

    writeToOutput(output, "```\n\n");
    logVerbose(`File tokens: ${fileTokens}`, 2, options.verbose);

    if (options.maxTokens && totalTokens >= options.maxTokens) {
      logVerbose(
        "Max tokens limit reached, stopping processing",
        1,
        options.verbose
      );
      break;
    }
  }

  if (options.outputPath && output instanceof fs.WriteStream) {
    await new Promise<void>((resolve) => {
      output.end(resolve);
    });
    logVerbose(`Total tokens processed: ${totalTokens}`, 1, options.verbose);
  }

  return totalTokens;
}
