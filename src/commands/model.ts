import { loadModelDb } from "../model-db";
import { resolve } from "pathe";
import { existsSync, promises as fsp } from "node:fs";
import consola from "consola";
import type { Argv } from "mri";

function formatModelInfo(modelInfo: any): string {
  if (!modelInfo) return "Model not found in database";

  const entries = Object.entries(modelInfo)
    .filter(([key]) => key !== "source" && key !== "litellm_provider")
    .map(([key, value]) => {
      // Format keys from snake_case to Title Case
      const formattedKey = key
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      // Format boolean values
      if (typeof value === "boolean") {
        return `${formattedKey}: ${value ? "Yes" : "No"}`;
      }

      // Format numbers with commas for readability
      if (typeof value === "number") {
        return `${formattedKey}: ${value.toLocaleString()}`;
      }

      return `${formattedKey}: ${value}`;
    });

  return entries.join("\n");
}

function filterModels(modelDb: Record<string, any>, filter: string): string[] {
  const models = Object.keys(modelDb);

  switch (filter.toLowerCase()) {
    case "latest": {
      return models.filter((model) => model.includes("latest"));
    }
    case "preview": {
      return models.filter((model) => model.includes("preview"));
    }
    case "gpt4":
    case "gpt-4": {
      return models.filter((model) => model.includes("gpt-4"));
    }
    case "claude": {
      return models.filter((model) => model.includes("claude"));
    }
    case "mistral": {
      return models.filter((model) => model.includes("mistral"));
    }
    case "gemini": {
      return models.filter(
        (model) =>
          model.toLowerCase().includes("gemini") ||
          model.toLowerCase().includes("google")
      );
    }
    case "deepseek": {
      return models.filter((model) => model.toLowerCase().includes("deepseek"));
    }
    case "qwen": {
      return models.filter((model) => model.toLowerCase().includes("qwen"));
    }
    case "all": {
      return models;
    }
    default: {
      return models.filter((model) => model.includes(filter));
    }
  }
}

export default async function modelCommand(rawArgs: Argv) {
  const subcommand = rawArgs._[1];
  const modelQuery = rawArgs._[2];

  if (subcommand !== "info" || !modelQuery) {
    consola.error(`
Usage: 
  npx codefetch model info <model-name>
  npx codefetch model info <filter>

Filters:
  latest   - Show all latest models
  preview  - Show preview models
  gpt4     - Show GPT-4 models
  claude   - Show Claude models
  mistral  - Show Mistral models
  gemini   - Show Google/Gemini models
  deepseek - Show Deepseek models
  qwen     - Show Qwen models
  all      - Show all available models
    `);
    process.exit(1);
  }

  const modelDb = await loadModelDb();
  const matchingModels = filterModels(modelDb, modelQuery);

  if (matchingModels.length === 0) {
    consola.error(`No models found matching "${modelQuery}"`);
    process.exit(1);
  }

  // If exact match found, show detailed info
  if (modelDb[modelQuery]) {
    consola.box({
      title: modelQuery,
      message: formatModelInfo(modelDb[modelQuery]),
      style: {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
      },
    });

    if (modelDb[modelQuery].source) {
      consola.info(`\nSource: ${modelDb[modelQuery].source}`);
    }
    return;
  }

  // Show list of matching models
  consola.box({
    title: `Models matching "${modelQuery}"`,
    message: matchingModels
      .sort()
      .map((model) => `- ${model}`)
      .join("\n"),
    style: {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "round",
    },
  });
}
