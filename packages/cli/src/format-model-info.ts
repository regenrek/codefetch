export function formatModelInfo(trackedModels: string[]): string {
  if (trackedModels.length === 0) return "";

  const header = "Tracked models:";
  const rows = trackedModels.map((modelName) => `- ${modelName}`);

  return [header, ...rows].join("\n");
}
