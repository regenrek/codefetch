import type { ModelDb } from "codefetch-sdk";

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
