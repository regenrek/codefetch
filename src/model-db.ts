const MODELDB_URL =
  "https://raw.githubusercontent.com/regenrek/codefetch/main/modeldb.json";

export async function loadModelDb(): Promise<Record<string, any>> {
  const response = await fetch(MODELDB_URL).catch(() => null);
  if (!response?.ok) return {};

  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  return data;
}
