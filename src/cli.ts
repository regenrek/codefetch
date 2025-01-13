#!/usr/bin/env node
import consola from "consola";
import mri from "mri";

const subCommands = {
  _default: () => import("./commands/default"),
  model: () => import("./commands/model"),
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

  await subCommands[subCommand]().then((r) => r.default(mri(args)));
}

main().catch(consola.error);
