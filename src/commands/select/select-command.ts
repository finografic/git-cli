import { execSync } from 'node:child_process';
import { exit } from 'node:process';

import * as p from '@clack/prompts';

interface GitHubPullRequestListItem {
  number: number;
  title: string;
  headRefName: string;
  state: string;
  createdAt: string;
}

interface PullRequest {
  number: string;
  title: string;
  branch: string;
  status: string;
  createdAt: string;
}

interface RunSelectCommandParams {
  argv: string[];
}

const parseGhPrListJson = ({ output }: { output: string }): PullRequest[] => {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected output from `gh pr list` (expected JSON array).');
  }

  return parsed
    .map((item): PullRequest | null => {
      const maybeItem = item as Partial<GitHubPullRequestListItem>;
      if (
        typeof maybeItem.number !== 'number'
        || typeof maybeItem.title !== 'string'
        || typeof maybeItem.headRefName !== 'string'
        || typeof maybeItem.state !== 'string'
        || typeof maybeItem.createdAt !== 'string'
      ) {
        return null;
      }

      return {
        number: maybeItem.number.toString(),
        title: maybeItem.title,
        branch: maybeItem.headRefName,
        status: maybeItem.state,
        createdAt: maybeItem.createdAt,
      };
    })
    .filter((pr): pr is PullRequest => pr !== null);
};

const formatRelativeTime = ({ isoDate }: { isoDate: string }): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) {
    return 'just now';
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

const printPrTable = ({ prs }: { prs: PullRequest[] }) => {
  const idHeader = 'ID';
  const titleHeader = 'TITLE';
  const branchHeader = 'BRANCH';
  const createdHeader = 'CREATED';

  const idWidth = Math.max(
    idHeader.length,
    ...prs.map((pr) => `#${pr.number}`.length),
  );
  const branchWidth = Math.max(
    branchHeader.length,
    ...prs.map((pr) => pr.branch.length),
  );
  const createdWidth = Math.max(
    createdHeader.length,
    ...prs.map((pr) => formatRelativeTime({ isoDate: pr.createdAt }).length),
  );

  const titleWidth = 70;
  const truncate = ({ text, max }: { text: string; max: number }) => {
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3))}...`;
  };

  const padEnd = ({ text, width }: { text: string; width: number }) => text.padEnd(width, ' ');

  console.log(
    `${padEnd({ text: idHeader, width: idWidth })}  ${
      padEnd({ text: titleHeader, width: titleWidth })
    }  ${padEnd({ text: branchHeader, width: branchWidth })}  ${
      padEnd({ text: createdHeader, width: createdWidth })
    }`,
  );

  for (const pr of prs) {
    const id = `#${pr.number}`;
    const title = truncate({ text: pr.title, max: titleWidth });
    const created = formatRelativeTime({ isoDate: pr.createdAt });

    console.log(
      `${padEnd({ text: id, width: idWidth })}  ${padEnd({ text: title, width: titleWidth })}  ${
        padEnd({ text: pr.branch, width: branchWidth })
      }  ${padEnd({ text: created, width: createdWidth })}`,
    );
  }

  console.log('');
};

export const runSelectCommand = async ({ argv }: RunSelectCommandParams) => {
  if (argv.includes('--help') || argv.includes('-h')) {
    console.log('Usage:\n  gli select [--show-list] [--no-list]\n');
    return;
  }

  console.clear();

  const shouldSkipList = argv.includes('--no-list');
  const shouldShowList = argv.includes('--show-list');

  try {
    const currentUser = execSync('gh api user -q .login', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    // Print styled gh output BEFORE clack starts rendering.
    if (!shouldSkipList && !shouldShowList) {
      execSync(`gh pr list --author ${currentUser}`, {
        stdio: 'inherit',
      });
      console.log('');
    }

    p.intro('🌿 Branch Select - Choose a branch to checkout');

    const spinner = p.spinner();
    spinner.start('Fetching your PRs...');

    const output = execSync(
      `gh pr list --author ${currentUser} --json number,title,headRefName,state,createdAt`,
      {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
      },
    );

    const prs = parseGhPrListJson({ output });
    spinner.stop('PRs loaded');

    if (!shouldSkipList && shouldShowList) {
      printPrTable({ prs });
    }

    if (prs.length === 0) {
      p.outro('No PRs found for your account in this repository.');
      exit(0);
    }

    const options = prs.map((pr) => ({
      value: pr.branch,
      label: pr.branch,
      hint: `#${pr.number} - ${pr.title.substring(0, 60)}${pr.title.length > 60 ? '...' : ''}`,
    }));

    const selectedBranch = await p.select({
      message: 'Select a branch to checkout:',
      options,
    });

    if (p.isCancel(selectedBranch)) {
      p.cancel('Operation cancelled');
      exit(0);
    }

    const checkoutSpinner = p.spinner();
    checkoutSpinner.start(`Checking out ${selectedBranch}...`);

    try {
      execSync(`git checkout ${selectedBranch}`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      });

      checkoutSpinner.stop(`Switched to branch: ${selectedBranch}`);
      p.outro('✅ Done!');
    } catch (error: unknown) {
      checkoutSpinner.stop('Checkout failed');
      p.log.error(
        `Failed to checkout branch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      exit(1);
    }
  } catch (error: unknown) {
    p.log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    p.log.info('Make sure you have the GitHub CLI (gh) installed and authenticated.');
    exit(1);
  }
};
