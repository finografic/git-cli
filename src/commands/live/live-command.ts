import logUpdate from 'log-update';
import pc from 'picocolors';

import {
  DEFAULT_LIVE_INTERVAL,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from '../../config/defaults.constants.js';
import {
  DEFAULT_PR_TITLE_SLICE_START,
  SPINNER_INTERVAL_MS,
  SPINNER_SEQUENCE,
} from '../../config/ui.constants.js';
import { getConfigFilePath, readConfig, tildeify } from '../../utils/config.utils.js';
import { getPlistPath, isDaemonInstalled, isDaemonRunning } from '../../utils/daemon.utils.js';
import type { PrStatus, RepoInfo } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs, fetchRepoInfo } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { computeColumnWidths, formatPrLines, terminalLink } from '../../utils/pr-display.utils.js';

interface RunLiveCommandParams {
  argv: string[];
}

interface LiveOptions {
  interval?: number;
  once?: boolean;
}

interface RepoSection {
  repoInfo: RepoInfo | null;
  pullRequests: PrStatus[];
  error?: string;
}

/**
 * Render the live PR status display.
 */
function renderDisplay(
  {
    sections,
    options,
    showTitle,
    titleMaxChars,
    titleSliceStart,
  }: {
    sections: RepoSection[];
    options: LiveOptions;
    showTitle: boolean;
    titleMaxChars: number;
    titleSliceStart: number;
  },
): string {
  const lines: string[] = [];

  // Header with 24h time (no timezone)
  const now = new Date();
  lines.push('');
  lines.push(
    `${pc.bold('📊 PR Status')} ${
      pc.dim(
        `updated: ${
          now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        }`,
      )
    }`,
  );
  lines.push('');

  // One section per repo — skip repos with no PRs and no error
  const visibleSections = sections.filter((s) => s.error || s.pullRequests.length > 0);

  if (visibleSections.length === 0) {
    lines.push(pc.dim('  No open PRs found'));
    lines.push('');
  }

  // Compute column widths across ALL repos for even alignment
  const allPrs = visibleSections.flatMap((s) => s.pullRequests);
  const globalWidths = computeColumnWidths({ prs: allPrs });

  for (const { repoInfo, pullRequests, error } of visibleSections) {
    if (repoInfo) {
      const pullsUrl = `${repoInfo.url}/pulls`;
      const repoLink = terminalLink({
        url: pullsUrl,
        label: pc.gray(repoInfo.nameWithOwner),
      });
      lines.push(`  ${repoLink}`);
      // lines.push('');
    }

    if (error) {
      lines.push(`  ${pc.red('✗')} ${pc.dim(error)}`);
    } else {
      const formattedLines = formatPrLines({
        prs: pullRequests,
        showTitle,
        titleMaxChars,
        titleSliceStart,
        ...globalWidths,
      });
      for (const line of formattedLines) {
        lines.push(`  ${line}`);
      }
    }

    lines.push('');
  }

  // Metadata Footer
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('');

  const daemonInstalled = isDaemonInstalled();
  const daemonRunning = isDaemonRunning();

  // Calculate label width for alignment
  const labels = ['config:', 'daemon:', 'plist'];
  const labelWidth = Math.max(...labels.map((l) => l.length));

  // Daemon status
  const daemonStatus = daemonRunning
    ? pc.green('✓ running')
    : daemonInstalled
    ? pc.yellow('○ installed, not running')
    : pc.dim('not installed');
  lines.push(`  ${pc.white('daemon:'.padEnd(labelWidth))}  ${daemonStatus}`);

  if (daemonInstalled) {
    lines.push(
      `  ${pc.white('plist'.padEnd(labelWidth))}  ${pc.dim(tildeify(getPlistPath()))}`,
    );
  }

  // Config info
  lines.push(
    `  ${pc.white('config:'.padEnd(labelWidth))}  ${pc.dim(tildeify(getConfigFilePath()))}`,
  );

  lines.push('');

  // Help text
  if (!options.once) {
    lines.push(
      pc.dim(
        `  Refreshing every ${options.interval || DEFAULT_LIVE_INTERVAL}s · Press Ctrl+C to exit`,
      ),
    );
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Fetch and display PR status.
 */
async function fetchAndDisplay({ options }: { options: LiveOptions }): Promise<void> {
  try {
    const config = readConfig();
    let sections: RepoSection[];

    if (config.repos.length > 0) {
      // Fetch PRs for all configured repos explicitly — works from any directory
      sections = config.repos.map((repo) => {
        try {
          const repoInfo = fetchRepoInfo({ repo: repo.remote });
          const allPrs = fetchMyOpenPrs({ repo: repo.remote });
          return { repoInfo, pullRequests: allPrs.filter((pr) => !pr.isDraft) };
        } catch (error: unknown) {
          return {
            repoInfo: null,
            pullRequests: [],
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      });
    } else {
      // No configured repos — fall back to current directory
      let repoInfo: RepoInfo | null = null;
      try {
        repoInfo = fetchRepoInfo();
      } catch {
        // Not critical
      }
      const allPrs = fetchMyOpenPrs();
      sections = [{ repoInfo, pullRequests: allPrs.filter((pr) => !pr.isDraft) }];
    }

    const showTitle = config.prListing?.title?.display ?? false;
    const titleMaxChars = config.prListing?.title?.maxChars ?? DEFAULT_PR_TITLE_MAX_CHARS;
    const titleSliceStart = config.prListing?.title?.sliceStart ?? DEFAULT_PR_TITLE_SLICE_START;
    const output = renderDisplay({ sections, options, showTitle, titleMaxChars, titleSliceStart });

    if (options.once) {
      console.log(output);
    } else {
      logUpdate(output);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const output = `\n${pc.red('Error:')} ${errorMsg}\n`;

    if (options.once) {
      console.error(output);
    } else {
      logUpdate(output);
    }
  }
}

/**
 * Show a spinner via logUpdate while waiting for the first data fetch.
 * Returns a cleanup function that stops the spinner.
 */
function startSpinner(): () => void {
  let frame = 0;
  const timer = setInterval(() => {
    const glyph = SPINNER_SEQUENCE[frame % SPINNER_SEQUENCE.length];
    logUpdate(`\n  ${pc.magenta(glyph)}  Fetching PR status…\n`);
    frame++;
  }, SPINNER_INTERVAL_MS);

  return () => clearInterval(timer);
}

/**
 * Run the live command.
 */
export async function runLiveCommand({ argv }: RunLiveCommandParams): Promise<void> {
  if (argv.includes('--help') || argv.includes('-h')) {
    printCommandHelp({
      command: 'gli live',
      description: 'Live-updating PR status dashboard (⭐ RECOMMENDED)',
      usage: 'gli live [options]',
      options: [
        {
          flag: '--interval <seconds>',
          description: `Refresh interval in seconds (default: ${DEFAULT_LIVE_INTERVAL})`,
        },
        {
          flag: '--once',
          description: 'Run once and exit (no live updates)',
        },
      ],
      examples: [
        {
          command: 'gli live',
          description: `Start live dashboard with ${DEFAULT_LIVE_INTERVAL}s refresh`,
        },
        {
          command: 'gli live --interval 20',
          description: 'Refresh every 20 seconds',
        },
        {
          command: 'gli live --once',
          description: 'Run once and exit',
        },
      ],
      sections: [
        {
          title: 'DESCRIPTION',
          content: `  Live-updating terminal dashboard for PR status, like htop but for your PRs.
  Perfect for running in a terminal panel to monitor pull requests in real-time.

  The dashboard shows:
  - PR list with status indicators (clickable PR numbers and repo names)
  - Summary of PRs needing rebase
  - Config and daemon status`,
        },
      ],
    });
    return;
  }

  // Parse options
  const options: LiveOptions = {
    interval: DEFAULT_LIVE_INTERVAL,
    once: false,
  };

  const intervalIndex = argv.indexOf('--interval');
  if (intervalIndex !== -1 && argv[intervalIndex + 1]) {
    const parsed = Number.parseInt(argv[intervalIndex + 1], 10);
    if (!Number.isNaN(parsed) && parsed >= 1) {
      options.interval = parsed;
    }
  }

  if (argv.includes('--once')) {
    options.once = true;
  }

  // Check gh availability
  try {
    assertGhAvailable();
  } catch (error: unknown) {
    console.error(
      pc.red('Error:'),
      error instanceof Error ? error.message : 'GitHub CLI not available',
    );
    process.exit(1);
  }

  // Run once or start live updates
  if (options.once) {
    await fetchAndDisplay({ options });
  } else {
    // Clear console before starting live mode
    console.clear();

    // Show spinner while first fetch runs
    const stopSpinner = startSpinner();
    await fetchAndDisplay({ options });
    stopSpinner();

    // Set up interval
    const intervalMs = (options.interval || DEFAULT_LIVE_INTERVAL) * 1000;
    setInterval(() => {
      fetchAndDisplay({ options });
    }, intervalMs);

    // Keep process alive
    process.stdin.resume();
  }
}
