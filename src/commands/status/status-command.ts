import { exit } from 'node:process';

import pc from 'picocolors';

import { readConfig, tildeify } from '../../utils/config.utils.js';
import type { RepoInfo } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs, fetchRepoInfo } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { formatPrLines, getPrSummary, terminalLink } from '../../utils/pr-display.utils.js';

interface RunStatusCommandParams {
  argv: string[];
}

/**
 * Display status for current repository.
 */
async function displayCurrentRepo(): Promise<void> {
  // Fetch repo info
  let repoInfo: RepoInfo | null = null;
  try {
    repoInfo = fetchRepoInfo();
  } catch {
    // Repo info not critical, continue without it
  }

  // Fetch PRs (non-draft only)
  let pullRequests;
  try {
    const allPrs = await fetchMyOpenPrs();
    pullRequests = allPrs.filter((pr) => !pr.isDraft);
  } catch (error: unknown) {
    console.error(
      `\n${pc.red('Error:')} ${error instanceof Error ? error.message : 'Unknown error'}\n`,
    );
    exit(1);
  }

  console.log('');
  console.log(pc.bold('📊 PR Status'));
  console.log('');

  // Repo header (clickable to /pulls page) - format: owner/repo in white
  if (repoInfo) {
    const pullsUrl = `${repoInfo.url}/pulls`;
    const repoLink = terminalLink({
      url: pullsUrl,
      label: pc.white(pc.bold(repoInfo.nameWithOwner)),
    });
    console.log(`  ${repoLink}`);
    console.log('');
  }

  // PR List with aligned columns
  if (pullRequests.length === 0) {
    console.log(pc.dim('  No open PRs found'));
  } else {
    const formattedLines = formatPrLines({ prs: pullRequests });
    for (const line of formattedLines) {
      console.log(`  ${line}`);
    }
  }

  console.log('');

  // Summary
  if (pullRequests.length > 0) {
    console.log(`  ${getPrSummary({ pullRequests })}`);
    console.log('');
  }
}

/**
 * Display status for all configured repositories.
 */
async function displayAllRepos(): Promise<void> {
  const config = readConfig();

  if (config.repos.length === 0) {
    console.log('');
    console.log(pc.yellow('No repositories configured.'));
    console.log(pc.dim(`Run ${pc.cyan('gli config add')} to add a repository.`));
    console.log('');
    return;
  }

  console.log('');
  console.log(pc.bold('📊 PR Status'));
  console.log('');

  let totalPrs = 0;
  let totalRebase = 0;

  for (const repo of config.repos) {
    // Repo header - show remote URL in white (clickable)
    const repoLink = terminalLink({ url: repo.remote, label: pc.white(pc.bold(repo.remote)) });
    console.log(`  ${repoLink}`);
    console.log(`  ${pc.dim(tildeify(repo.localPath))}`);
    console.log('');

    let pullRequests;
    try {
      const allPrs = await fetchMyOpenPrs({ repo: repo.remote });
      pullRequests = allPrs.filter((pr) => !pr.isDraft);
    } catch (error: unknown) {
      console.log(
        `  ${pc.red('✗')} ${pc.dim(error instanceof Error ? error.message : 'Unknown error')}`,
      );
      console.log('');
      continue;
    }

    if (pullRequests.length === 0) {
      console.log(`  ${pc.dim('No open PRs')}`);
      console.log('');
      continue;
    }

    // PR list with aligned columns
    const formattedLines = formatPrLines({ prs: pullRequests });
    for (const line of formattedLines) {
      console.log(`    ${line}`);
    }

    console.log('');

    // Summary for this repo
    console.log(`    ${getPrSummary({ pullRequests })}`);
    console.log('');

    totalPrs += pullRequests.length;
    totalRebase += pullRequests.filter(
      (pr) => pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY',
    ).length;
  }

  // Overall summary
  if (totalPrs > 0) {
    console.log(pc.bold('Summary'));
    console.log(
      `  ${
        pc.bold(`${totalPrs} open PR${totalPrs === 1 ? '' : 's'}`)
      } across ${config.repos.length} ${config.repos.length === 1 ? 'repository' : 'repositories'}`,
    );
    if (totalRebase > 0) {
      console.log(`  ${pc.yellow(`${totalRebase} need${totalRebase === 1 ? 's' : ''} rebase`)}`);
    }
    console.log('');
  }
}

/**
 * Run the status command.
 */
export async function runStatusCommand({ argv }: RunStatusCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
      command: 'gli status',
      description: 'Show the merge status of your open pull requests',
      usage: 'gli status [options]',
      options: [
        {
          flag: '--all',
          description: 'Check PRs across all configured repositories',
        },
      ],
      examples: [
        {
          command: 'gli status',
          description: 'Show PRs for current repository',
        },
        {
          command: 'gli status --all',
          description: 'Show PRs across all configured repositories',
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

  // Display status for all repos or current repo
  if (argv.includes('--all')) {
    await displayAllRepos();
  } else {
    await displayCurrentRepo();
  }
}
