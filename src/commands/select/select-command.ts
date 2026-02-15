import { execSync } from 'node:child_process';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import type { PrStatus } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { formatPrLines } from '../../utils/pr-display.utils.js';

interface RunSelectCommandParams {
  argv: string[];
}

/**
 * Run the select command.
 */
export async function runSelectCommand({ argv }: RunSelectCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
      command: 'gli select',
      description: 'Interactively checkout a branch from one of your open PRs',
      usage: 'gli select',
      examples: [
        {
          command: 'gli select',
          description: 'Show PR list and select a branch to checkout',
        },
      ],
    });
    return;
  }

  // Check gh availability
  try {
    assertGhAvailable();
  } catch (error: unknown) {
    console.error(
      pc.red('Error:'),
      error instanceof Error ? error.message : 'GitHub CLI not available',
    );
    exit(1);
  }

  // Fetch PRs (including drafts for select)
  let pullRequests: PrStatus[];
  try {
    pullRequests = await fetchMyOpenPrs();
  } catch (error: unknown) {
    console.error(
      `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    exit(1);
  }

  if (pullRequests.length === 0) {
    console.log('');
    console.log(pc.yellow('No open PRs found for your account in this repository.'));
    console.log('');
    exit(0);
  }

  console.log('');
  console.log(pc.bold('🌿 Select Branch'));
  console.log('');

  // Display PR list with aligned columns
  const formattedLines = formatPrLines({ prs: pullRequests });
  for (const line of formattedLines) {
    console.log(`  ${line}`);
  }

  console.log('');

  // Interactive selection
  const options = pullRequests.map((pr) => ({
    value: pr.headRefName,
    label: pr.headRefName,
    hint: `PR#${pr.number} - ${pr.title.length > 50 ? `${pr.title.slice(0, 47)}...` : pr.title}`,
  }));

  const selectedBranch = await clack.select({
    message: 'Select a branch to checkout:',
    options,
  });

  if (clack.isCancel(selectedBranch)) {
    console.log('');
    console.log(pc.dim('Cancelled'));
    console.log('');
    exit(0);
  }

  // Checkout the branch
  try {
    execSync(`git checkout ${selectedBranch}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log('');
    console.log(pc.green(`✓ Switched to branch: ${pc.bold(selectedBranch)}`));
    console.log('');
  } catch (error: unknown) {
    console.error('');
    console.error(
      pc.red('✗ Failed to checkout branch:'),
      error instanceof Error ? error.message : 'Unknown error',
    );
    console.error('');
    exit(1);
  }
}
