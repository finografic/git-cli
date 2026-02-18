#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { exit } from 'node:process';
import { fileURLToPath } from 'node:url';

import pc from 'picocolors';

import { runConfigCommand } from './commands/config/index.js';
import { runLiveCommand } from './commands/live/index.js';
import { runRebaseCommand } from './commands/rebase/index.js';
import { runSelectCommand } from './commands/select/index.js';
import { runStatusCommand } from './commands/status/index.js';
import { runWatchCommand } from './commands/watch/index.js';

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
  const lines: string[] = [];

  lines.push('');
  lines.push(`${pc.bold('gli')} - Git utilities for monitoring and managing PRs from the terminal`);
  lines.push('');

  lines.push(pc.bold('USAGE'));
  lines.push('  gli <command> [options]');
  lines.push('');

  lines.push(pc.bold('COMMANDS'));
  const commands = [
    { name: 'live', desc: 'Live-updating PR status dashboard (⭐ FEATURE)' },
    { name: 'status', desc: 'Show merge status of your open PRs' },
    { name: 'rebase', desc: 'Interactively rebase branches that are behind' },
    { name: 'select', desc: 'Interactively checkout a branch for one of your PRs' },
    { name: 'config', desc: 'Manage multi-repo configuration' },
    { name: 'watch', desc: 'Background PR monitoring with macOS notifications' },
  ];
  const maxNameLength = Math.max(...commands.map((c) => c.name.length));
  for (const cmd of commands) {
    lines.push(`  ${cmd.name.padEnd(maxNameLength + 4)}${cmd.desc}`);
  }
  lines.push('');

  lines.push(pc.bold('OPTIONS'));
  lines.push('  -h, --help       Show help for a command');
  lines.push('  -v, --version    Show version number');
  lines.push('');

  lines.push(pc.bold('EXAMPLES'));
  lines.push('  gli live                   # Start live PR dashboard');
  lines.push('  gli status                 # Show PR status for current repo');
  lines.push('  gli status --all           # Show PR status for all configured repos');
  lines.push('  gli rebase                 # Select and rebase a branch');
  lines.push('  gli config add             # Add current repo to config');
  lines.push('  gli watch install          # Install background monitoring');
  lines.push('');

  lines.push(pc.bold('GET HELP'));
  lines.push('  gli <command> --help       # Show detailed help for a command');
  lines.push('');

  console.log(lines.join('\n'));
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

  if (command === 'config') {
    await runConfigCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'live') {
    await runLiveCommand({ argv: argv.slice(1) });
    return;
  }

  if (command === 'rebase') {
    await runRebaseCommand({ argv: argv.slice(1) });
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

  if (command === 'watch') {
    await runWatchCommand({ argv: argv.slice(1) });
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
