const MODELDB_URL =
  "https://raw.githubusercontent.com/regenrek/codefetch/main/modeldb.json";

export interface ModelInfo {
  max_tokens: number;
  max_input_tokens: number;
  max_output_tokens: number;
  litellm_provider: string;
}

export interface ModelDb {
  [key: string]: ModelInfo;
}

export async function getLocalModels(): Promise<ModelDb> {
  return {
    o3: {
      max_tokens: 100_000,
      max_input_tokens: 200_000,
      max_output_tokens: 100_000,
      litellm_provider: "openai",
    },
    "gemini-2.5-pro": {
      max_tokens: 65_535,
      max_input_tokens: 1_048_576,
      max_output_tokens: 65_535,
      litellm_provider: "gemini",
    },
    "claude-sonnet-4": {
      max_tokens: 64_000,
      max_input_tokens: 200_000,
      max_output_tokens: 64_000,
      litellm_provider: "anthropic",
    },
    "claude-opus-4": {
      max_tokens: 32_000,
      max_input_tokens: 200_000,
      max_output_tokens: 32_000,
      litellm_provider: "anthropic",
    },
  };
}

async function loadModelDb(): Promise<ModelDb> {
  const response = await fetch(MODELDB_URL).catch(() => null);
  if (!response?.ok) return {};

  const rawData = await response.json().catch(() => ({}));
  return rawData;
}

export async function fetchModels(trackedModels: string[]): Promise<{
  modelDb: ModelDb;
  modelInfo: string;
}> {
  const localModels = await getLocalModels();
  const missingModels = trackedModels.filter((model) => !localModels[model]);

  if (missingModels.length === 0) {
    const modelInfo = formatModelInfo(trackedModels, localModels);
    return { modelDb: localModels, modelInfo };
  }

  const remoteData = await loadModelDb();
  const remoteModels: ModelDb = {};

  for (const modelName of missingModels) {
    const model = remoteData[modelName];
    if (
      model?.max_tokens &&
      model.max_input_tokens &&
      model.max_output_tokens &&
      model.litellm_provider
    ) {
      remoteModels[modelName] = {
        max_tokens: model.max_tokens,
        max_input_tokens: model.max_input_tokens,
        max_output_tokens: model.max_output_tokens,
        litellm_provider: model.litellm_provider,
      };
    }
  }

  const modelDb = { ...remoteModels, ...localModels };
  const modelInfo = formatModelInfo(trackedModels, modelDb);

  return { modelDb, modelInfo };
}

export function formatModelInfo(
  trackedModels: string[],
  modelDb: ModelDb
): string {
  const rows = trackedModels.map((modelName) => {
    const model = modelDb[modelName] || {};
    const tokens = model.max_input_tokens
      ? model.max_input_tokens.toLocaleString()
      : "Unknown";
    return `│ ${modelName.padEnd(30)} │ ${tokens.padEnd(15)} │`;
  });

  const header = "│ Model Name                      │ Max Tokens     │";
  const separator = "├────────────────────────────────┼────────────────┤";
  const topBorder = "┌────────────────────────────────┬────────────────┐";
  const bottomBorder = "└────────────────────────────────┴────────────────┘";

  return [topBorder, header, separator, ...rows, bottomBorder].join("\n");
}
