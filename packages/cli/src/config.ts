import { loadConfig } from "c12";
import {
  type CodefetchConfig,
  getDefaultConfig,
  resolveCodefetchConfig,
  createCustomConfigMerger,
  mergeWithCliArgs,
} from "codefetch-sdk";

export {
  type CodefetchConfig,
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
} from "codefetch-sdk";

export async function loadCodefetchConfig(
  cwd: string,
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const defaults = getDefaultConfig();
  const customMerger = createCustomConfigMerger();

  const { config } = await loadConfig<CodefetchConfig>({
    name: "codefetch",
    cwd,
    defaults,
    merger: customMerger,
  });

  // Merge CLI args after loading config
  const mergedConfig = overrides ? mergeWithCliArgs(config, overrides) : config;

  return await resolveCodefetchConfig(mergedConfig, cwd);
}

export async function getConfig(
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const cwd = process.cwd();
  return await loadCodefetchConfig(cwd, overrides);
}
