import { execSync } from 'node:child_process';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import type { PrStatus } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchDefaultBranch, fetchMyOpenPrs } from '../../utils/gh.utils.js';

interface RunRebaseCommandParams {
  argv: string[];
}

const needsRebase = ({ pr }: { pr: PrStatus }): boolean =>
  pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY';

const getCurrentBranch = (): string =>
  execSync('git rev-parse --abbrev-ref HEAD', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

const hasUncommittedChanges = (): boolean => {
  const output = execSync('git status --porcelain', {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

  return output.length > 0;
};

const rebaseBranch = ({ branch, defaultBranch, dryRun }: { branch: string; defaultBranch: string; dryRun: boolean }): boolean => {
  if (dryRun) {
    clack.log.info(`${pc.dim('[dry-run]')} Would rebase ${pc.bold(branch)} onto ${pc.bold(`origin/${defaultBranch}`)}`);
    return true;
  }

  const spinner = clack.spinner();

  try {
    spinner.start(`Fetching origin...`);
    execSync('git fetch origin', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    spinner.stop('Fetched origin');
  } catch (error: unknown) {
    spinner.stop('Fetch failed');
    clack.log.error(error instanceof Error ? error.message : 'Failed to fetch origin');
    return false;
  }

  try {
    spinner.start(`Checking out ${branch}...`);
    execSync(`git checkout ${branch}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    spinner.stop(`On branch ${pc.bold(branch)}`);
  } catch (error: unknown) {
    spinner.stop('Checkout failed');
    clack.log.error(error instanceof Error ? error.message : `Failed to checkout ${branch}`);
    return false;
  }

  try {
    spinner.start(`Rebasing onto origin/${defaultBranch}...`);
    execSync(`git rebase origin/${defaultBranch}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    spinner.stop('Rebase succeeded');
  } catch {
    spinner.stop('Rebase conflict');
    clack.log.warn(
      `Conflicts detected. Resolve them manually, then run:\n`
      + `  ${pc.dim('git rebase --continue')}\n`
      + `  ${pc.dim(`git push --force-with-lease origin ${branch}`)}`,
    );
    execSync('git rebase --abort', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return false;
  }

  try {
    spinner.start('Pushing with --force-with-lease...');
    execSync(`git push --force-with-lease origin ${branch}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    spinner.stop(`Pushed ${pc.bold(branch)}`);
  } catch (error: unknown) {
    spinner.stop('Push failed');
    clack.log.error(error instanceof Error ? error.message : 'Failed to push');
    return false;
  }

  return true;
};

export const runRebaseCommand = async ({ argv }: RunRebaseCommandParams) => {
  const dryRun = argv.includes('--dry-run');
  const all = argv.includes('--all');

  if (argv.includes('--help') || argv.includes('-h')) {
    console.log(
      'Usage:\n  gli rebase [--all] [--dry-run]\n\n'
      + 'Interactively rebase branches that are behind the default branch.\n\n'
      + 'Flags:\n'
      + '  --all      Rebase all branches that need it (with confirmation)\n'
      + '  --dry-run  Show what would happen without executing\n',
    );
    return;
  }

  clack.intro('PR Rebase');

  try {
    assertGhAvailable();
  } catch (error: unknown) {
    clack.log.error(error instanceof Error ? error.message : 'GitHub CLI not available.');
    exit(1);
  }

  if (!dryRun && hasUncommittedChanges()) {
    clack.log.error('You have uncommitted changes. Please commit or stash them first.');
    clack.outro('Aborted');
    exit(1);
  }

  const originalBranch = getCurrentBranch();

  const spinner = clack.spinner();
  spinner.start('Fetching your open PRs...');

  let prs: PrStatus[];
  try {
    prs = fetchMyOpenPrs();
  } catch (error: unknown) {
    spinner.stop('Failed to fetch PRs');
    clack.log.error(error instanceof Error ? error.message : 'Unknown error');
    exit(1);
  }

  const stale = prs.filter((pr) => !pr.isDraft && needsRebase({ pr }));
  spinner.stop(`Found ${stale.length} PR${stale.length === 1 ? '' : 's'} needing rebase`);

  if (stale.length === 0) {
    clack.log.success('All PRs are up to date. Nothing to rebase.');
    clack.outro('Done');
    return;
  }

  for (const pr of stale) {
    const statusLabel = pr.mergeStateStatus === 'DIRTY' ? pc.red('diverged') : pc.yellow('behind');
    clack.log.message(`${pc.dim(`#${pr.number}`)} ${pr.title}\n         ${pc.dim(pr.headRefName)} · ${statusLabel}`);
  }

  let defaultBranch: string;
  try {
    defaultBranch = fetchDefaultBranch();
  } catch {
    clack.log.error('Could not detect the default branch.');
    exit(1);
  }

  clack.log.info(`Default branch: ${pc.bold(defaultBranch)}`);

  let toRebase: PrStatus[];

  if (all) {
    const confirm = await clack.confirm({
      message: `Rebase all ${stale.length} branch${stale.length === 1 ? '' : 'es'} onto origin/${defaultBranch}?`,
    });

    if (clack.isCancel(confirm) || !confirm) {
      clack.outro('Cancelled');
      return;
    }

    toRebase = stale;
  } else {
    const selected = await clack.select({
      message: 'Which branch do you want to rebase?',
      options: [
        ...stale.map((pr) => ({
          value: pr.headRefName,
          label: pr.headRefName,
          hint: `#${pr.number} ${pr.title.length > 40 ? `${pr.title.slice(0, 37)}...` : pr.title}`,
        })),
        { value: '__done__', label: 'Cancel' },
      ],
    });

    if (clack.isCancel(selected) || selected === '__done__') {
      clack.outro('Cancelled');
      return;
    }

    const match = stale.find((pr) => pr.headRefName === selected);
    if (!match) {
      clack.outro('Cancelled');
      return;
    }

    toRebase = [match];
  }

  let succeeded = 0;
  let failed = 0;

  for (const pr of toRebase) {
    clack.log.step(`Rebasing ${pc.bold(pr.headRefName)} (#${pr.number})`);
    const ok = rebaseBranch({ branch: pr.headRefName, defaultBranch, dryRun });

    if (ok) {
      succeeded++;
    } else {
      failed++;
    }
  }

  if (!dryRun) {
    try {
      execSync(`git checkout ${originalBranch}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      clack.log.info(`Returned to ${pc.bold(originalBranch)}`);
    } catch {
      clack.log.warn(`Could not return to original branch ${originalBranch}`);
    }
  }

  if (dryRun) {
    clack.outro(`Dry run complete — ${toRebase.length} branch${toRebase.length === 1 ? '' : 'es'} would be rebased`);
  } else if (failed === 0) {
    clack.outro(`Rebased ${succeeded} branch${succeeded === 1 ? '' : 'es'} successfully`);
  } else {
    clack.outro(`${succeeded} succeeded, ${failed} failed`);
  }
};
