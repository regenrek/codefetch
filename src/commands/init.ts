import { promises as fsp } from "node:fs";
import { join } from "pathe";
import consola from "consola";
import type { CodefetchConfig } from "../config";

const createConfigFile = async (
  config: Partial<CodefetchConfig>,
  cwd: string
) => {
  const configContent = `/** @type {import('codefetch').CodefetchConfig} */
export default ${JSON.stringify(config, null, 2)};
`;

  await fsp.writeFile(join(cwd, "codefetch.config.mjs"), configContent);
};

const createIgnoreFile = async (cwd: string) => {
  const content = "test/\nvitest.config.ts\n";
  await fsp.writeFile(join(cwd, ".codefetchignore"), content);
};

const createDirectoryStructure = async (cwd: string) => {
  await fsp.mkdir(join(cwd, "codefetch"), { recursive: true });
  await fsp.mkdir(join(cwd, "codefetch/prompts"), { recursive: true });

  const { default: fixPrompt } = await import("../prompts/fix");
  await fsp.writeFile(join(cwd, "codefetch/prompts/default.md"), fixPrompt);
};

export default async function initCommand() {
  const cwd = process.cwd();

  const setupType = await consola.prompt("Choose setup type:", {
    type: "select",
    options: ["default", "custom"],
  });

  if (setupType === "default") {
    const config: Partial<CodefetchConfig> = {
      projectTree: 5,
      tokenLimiter: "truncated" as const,
      defaultPromptFile: "default.md",
    };
    await createConfigFile(config, cwd);
    await createIgnoreFile(cwd);
    await createDirectoryStructure(cwd);
  } else {
    const extensions = await consola.prompt(
      "Enter file extensions to filter (comma-separated, press enter for none, e.g. .ts,.js):",
      { type: "text" }
    );

    const tokenEncoder = await consola.prompt("Choose token encoder:", {
      type: "select",
      options: [
        { label: "simple (recommended)", value: "simple" },
        "p50k",
        "o200k",
        "cl100k",
      ],
    });

    // const defaultModels = [
    //   "gpt-4-0125-preview",
    //   "gpt-4o-2024-11-20",
    //   "claude-3-sonnet-20240229",
    //   "o1",
    //   "mistral-large-latest",
    // ];

    // const trackedModels = await consola.prompt(
    //   `Choose models to track (comma-separated)\nDefault: ${defaultModels.join(", ")}:`,
    //   { type: "text", initial: defaultModels.join(",") }
    // );

    const config: Partial<CodefetchConfig> = {
      extensions: extensions
        ? extensions.split(",").map((e) => e.trim())
        : undefined,
      tokenEncoder: tokenEncoder as any,
      // trackedModels: trackedModels
      //   ? trackedModels.split(",").map((m) => m.trim())
      //   : defaultModels,
    };

    await createConfigFile(config, cwd);
    await createIgnoreFile(cwd);
    await createDirectoryStructure(cwd);
  }

  consola.success("✨ Initialization complete!");
  consola.info(
    "📝 A .codefetchignore file was created (add your files that you want to ignore)"
  );
  consola.info("⚙️  A codefetch.config.mjs is created (customize as you like)");
  consola.info(
    "\nYour codebase files will be placed into the codefetch folder"
  );
  consola.info("\nCustomize your prompts in codefetch/prompts/default.md");
  consola.info("\nNow you can run:");
  consola.info("npx codefetch");
  consola.info("or");
  consola.info("npx codefetch --help (for all options)");
}
