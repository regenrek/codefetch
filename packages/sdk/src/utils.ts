import { existsSync } from "node:fs";
import { parse, join, dirname } from "pathe";

export const findProjectRoot = (startDir: string): string => {
  let currentDir = startDir;
  while (currentDir !== parse(currentDir).root) {
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }
  return startDir;
};
