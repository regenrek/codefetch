import { loadConfig } from "c12";
import {
  type CodefetchConfig,
  getDefaultConfig,
  resolveCodefetchConfig,
  createCustomConfigMerger,
} from "@codefetch/sdk";

export {
  type CodefetchConfig,
  getDefaultConfig,
  resolveCodefetchConfig,
  mergeWithCliArgs,
} from "@codefetch/sdk";

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
    overrides: overrides as CodefetchConfig,
    merger: customMerger,
  });

  return await resolveCodefetchConfig(config, cwd);
}

export async function getConfig(
  overrides?: Partial<CodefetchConfig>
): Promise<CodefetchConfig> {
  const cwd = process.cwd();
  return await loadCodefetchConfig(cwd, overrides);
}
