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
    "deepseek-v3": {
      max_tokens: 4096,
      max_input_tokens: 128_000,
      max_output_tokens: 4096,
      litellm_provider: "deepseek",
    },
    "chatgpt-4o-latest": {
      max_tokens: 4096,
      max_input_tokens: 128_000,
      max_output_tokens: 4096,
      litellm_provider: "openai",
    },
    o1: {
      max_tokens: 100_000,
      max_input_tokens: 200_000,
      max_output_tokens: 100_000,
      litellm_provider: "openai",
    },
    "claude-3-5-sonnet-20241022": {
      max_tokens: 8192,
      max_input_tokens: 200_000,
      max_output_tokens: 8192,
      litellm_provider: "anthropic",
    },
    "gemini-2.0-flash-exp": {
      max_tokens: 8192,
      max_input_tokens: 1_048_576,
      max_output_tokens: 8192,
      litellm_provider: "gemini",
    },
    "gemini-exp-1206": {
      max_tokens: 8192,
      max_input_tokens: 2_097_152,
      max_output_tokens: 8192,
      litellm_provider: "gemini",
    },
  };
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

function formatModelInfo(trackedModels: string[], modelDb: ModelDb): string {
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

async function loadModelDb(): Promise<ModelDb> {
  const response = await fetch(MODELDB_URL).catch(() => null);
  if (!response?.ok) return {};

  const rawData = await response.json().catch(() => ({}));
  // @ts-expect-error intentionally ignore ModelDb type check for remote data
  return rawData;
}
