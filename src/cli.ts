#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';

import { runSelectCommand } from './commands/select/index.js';
import { runStatusCommand } from './commands/status/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getVersion = (): string => {
  try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version || 'unknown';
  } catch {
    return 'unknown';
  }
};

const printHelp = () => {
  // Keep this minimal and stable; more commands will be added later.
  console.log(
    'gli - git cli\n\nUsage:\n  gli <command>\n\nCommands:\n  select  Interactively checkout a branch for one of your PRs\n  status  Show merge status of your open PRs\n',
  );
};

const main = async () => {
  const [, , ...argv] = process.argv;
  const [command] = argv;

  if (
    !command
    || command === 'help'
    || command === '--help'
    || command === '-h'
  ) {
    printHelp();
    return;
  }

  if (command === '--version' || command === '-v') {
    console.log(getVersion());
    return;
  }

  if (command === 'select') {
    await runSelectCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'status') {
    await runStatusCommand({ argv: argv.slice(1) });
    return;
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  exit(1);
};

main().catch((error: unknown) => {
  console.error(error);
  exit(1);
});
