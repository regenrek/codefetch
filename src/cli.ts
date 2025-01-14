#!/usr/bin/env node
import consola from "consola";
import mri from "mri";

// Define proper types for subCommands and their return values
type CommandModule = {
  default: (args: any) => Promise<void>;
};

const subCommands: Record<string, () => Promise<CommandModule>> = {
  _default: () => import("./commands/default"),
  model: () => import("./commands/model"),
  init: () => import("./commands/init"),
};

async function main() {
  const args = process.argv.slice(2);
  let subCommand = args[0];
  if (!subCommand || subCommand.startsWith("-")) {
    subCommand = "_default";
  } else {
    args.shift();
  }

  if (!(subCommand in subCommands)) {
    consola.error(`Unknown command ${subCommand}`);
    process.exit(1);
  }

  await subCommands[subCommand as keyof typeof subCommands]?.()
    .then((mod) => mod.default(mri(args)))
    .catch((error) => {
      console.error("Error executing command:", error);
      process.exit(1);
    });
}

main().catch(consola.error);
