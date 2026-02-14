import { execSync } from 'node:child_process';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import type { PrStatus } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from '../../utils/gh.utils.js';

interface RunStatusCommandParams {
  argv: string[];
}

type StatusGroup = 'rebase' | 'attention' | 'clean';

const getStatusLabel = ({ mergeStateStatus }: { mergeStateStatus: string }): string => {
  switch (mergeStateStatus) {
    case 'CLEAN': return pc.green('✓ Up to date');
    case 'BEHIND': return pc.yellow('⚠ Behind — rebase needed');
    case 'DIRTY': return pc.red('✗ Diverged — rebase needed');
    case 'BLOCKED': return pc.dim('○ Blocked');
    case 'UNSTABLE': return pc.dim('○ CI running or failed');
    default: return pc.dim('? Status pending');
  }
};

const getStatusGroup = ({ mergeStateStatus }: { mergeStateStatus: string }): StatusGroup => {
  if (mergeStateStatus === 'BEHIND' || mergeStateStatus === 'DIRTY') return 'rebase';
  if (mergeStateStatus === 'BLOCKED' || mergeStateStatus === 'UNSTABLE' || mergeStateStatus === 'UNKNOWN') return 'attention';
  return 'clean';
};

const groupPrsByStatus = ({ prs }: { prs: PrStatus[] }): PrStatus[] => {
  const grouped: Record<StatusGroup, PrStatus[]> = {
    rebase: [],
    attention: [],
    clean: [],
  };

  for (const pr of prs) {
    const group = getStatusGroup({ mergeStateStatus: pr.mergeStateStatus });
    grouped[group].push(pr);
  }

  return [...grouped.rebase, ...grouped.attention, ...grouped.clean];
};

const displayPrList = ({ prs }: { prs: PrStatus[] }) => {
  const sorted = groupPrsByStatus({ prs });

  for (const pr of sorted) {
    const status = getStatusLabel({ mergeStateStatus: pr.mergeStateStatus });
    const prNumber = pc.dim(`#${pr.number}`);
    const title = pr.title.length > 60 ? `${pr.title.slice(0, 57)}...` : pr.title;
    const branch = pc.dim(pr.headRefName);

    clack.log.message(`${status}  ${prNumber} ${title}\n         ${branch}`);
  }

  const rebaseCount = prs.filter(
    (pr) => pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY',
  ).length;

  const summary = rebaseCount > 0
    ? `${prs.length} open PRs · ${pc.yellow(`${rebaseCount} need rebase`)}`
    : `${prs.length} open PRs · ${pc.green('all up to date')}`;

  clack.log.info(summary);
};

export const runStatusCommand = async ({ argv }: RunStatusCommandParams) => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage:\n  gli status\n\nShow the merge status of your open PRs in the current repo.\n');
    return;
  }

  clack.intro('PR Status');

  try {
    assertGhAvailable();
  } catch (error: unknown) {
    clack.log.error(error instanceof Error ? error.message : 'GitHub CLI not available.');
    exit(1);
  }

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

  const nonDraftPrs = prs.filter((pr) => !pr.isDraft);
  spinner.stop(`Found ${nonDraftPrs.length} open PR${nonDraftPrs.length === 1 ? '' : 's'}`);

  if (nonDraftPrs.length === 0) {
    clack.log.info('No open PRs found for your account in this repository.');
    clack.outro('Done');
    return;
  }

  displayPrList({ prs: nonDraftPrs });

  const action = await clack.select({
    message: 'What would you like to do?',
    options: [
      ...nonDraftPrs.map((pr) => ({
        value: pr.url,
        label: `Open #${pr.number} in browser`,
        hint: pr.title.length > 40 ? `${pr.title.slice(0, 37)}...` : pr.title,
      })),
      { value: 'done', label: 'Done' },
    ],
  });

  if (clack.isCancel(action) || action === 'done') {
    clack.outro('Done');
    return;
  }

  try {
    execSync(`gh pr view --web "${action}"`, {
      stdio: 'inherit',
    });
  } catch {
    clack.log.error('Failed to open PR in browser.');
  }

  clack.outro('Done');
};
