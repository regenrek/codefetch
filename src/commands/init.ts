import { promises as fsp } from "node:fs";
import { join } from "pathe";
import consola from "consola";
import type { CodefetchConfig } from "../config";
import { getDefaultConfig } from "../config";

const createConfigFile = async (
  config: Partial<CodefetchConfig>,
  cwd: string
) => {
  const configContent = `import type { CodefetchConfig } from 'codefetch'

export default {
  ${Object.entries(config)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}: ${JSON.stringify(value, null, 2)}`)
    .join(",\n  ")}
} satisfies Partial<CodefetchConfig>
`;

  await fsp.writeFile(join(cwd, "codefetch.config.ts"), configContent);
};

const createIgnoreFile = async (cwd: string) => {
  const content = "test/\nvitest.config.ts\n";
  await fsp.writeFile(join(cwd, ".codefetchignore"), content);
};

export default async function initCommand() {
  const cwd = process.cwd();

  const setupType = await consola.prompt("Choose setup type:", {
    type: "select",
    options: ["default", "custom"],
  });

  if (setupType === "default") {
    const config = getDefaultConfig();
    await createConfigFile(config, cwd);
    await createIgnoreFile(cwd);
  } else {
    const extensions = await consola.prompt(
      "Enter file extensions to filter (comma-separated, press enter for none):",
      { type: "text" }
    );

    const tokenEncoder = await consola.prompt("Choose token encoder:", {
      type: "select",
      options: ["simple", "p50k", "o200k", "cl100k"],
    });

    const defaultModels = [
      "gpt-4-0125-preview",
      "gpt-4o-2024-11-20",
      "claude-3-sonnet-20240229",
      "o1",
      "mistral-large-latest",
    ];

    const trackedModels = await consola.prompt(
      `Choose models to track (comma-separated)\nDefault: ${defaultModels.join(", ")}:`,
      { type: "text", initial: defaultModels.join(",") }
    );

    const config: Partial<CodefetchConfig> = {
      extensions: extensions
        ? extensions.split(",").map((e) => e.trim())
        : undefined,
      tokenEncoder: tokenEncoder as any,
      trackedModels: trackedModels
        ? trackedModels.split(",").map((m) => m.trim())
        : defaultModels,
    };

    await createConfigFile(config, cwd);
    await createIgnoreFile(cwd);
  }

  consola.success("✨ Initialization complete!");
  consola.info(
    "📝 A .codefetchignore file was created (add your files that you want to ignore)"
  );
  consola.info("⚙️  A codefetch.config.ts is created (customize as you like)");
  consola.info(
    "\nYour codebase files will be placed into the codefetch folder"
  );
  consola.info("\nNow you can run:");
  consola.info("npx codefetch");
  consola.info("or");
  consola.info("npx codefetch --help (for all options)");
}
