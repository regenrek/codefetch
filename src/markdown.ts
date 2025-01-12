import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Writable } from "node:stream";

function estimateTokens(text: string): number {
  return text.split(/[\s\p{P}]+/u).filter(Boolean).length;
}

export async function generateMarkdown(
  files: string[],
  options: {
    outputPath: string | null;
    maxTokens: number | null;
    verbose: boolean;
    projectTree?: string;
  }
): Promise<number> {
  let totalTokens = 0;

  // Create output directory if needed
  if (options.outputPath) {
    const outputDir = path.dirname(options.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
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
    writeToOutput(output, "```\n");
    writeToOutput(output, options.projectTree);
    writeToOutput(output, "```\n\n");
    totalTokens += estimateTokens(options.projectTree);
  }

  // Write files
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);

    const fileStream = fs.createReadStream(file, { encoding: "utf8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    writeToOutput(output, `${relativePath}\n`);
    writeToOutput(output, "```\n");

    let lineNumber = 1;
    for await (const line of rl) {
      const lineTokens = estimateTokens(line);
      if (options.maxTokens && totalTokens + lineTokens > options.maxTokens) {
        break;
      }

      writeToOutput(output, `${lineNumber} | ${line}\n`);
      totalTokens += lineTokens;
      lineNumber++;
    }

    writeToOutput(output, "```\n\n");

    if (options.maxTokens && totalTokens >= options.maxTokens) {
      break;
    }
  }

  if (options.outputPath && output instanceof fs.WriteStream) {
    await new Promise<void>((resolve) => {
      output.end(resolve);
    });
  }

  return totalTokens;
}
