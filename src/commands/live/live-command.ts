import logUpdate from 'log-update';
import pc from 'picocolors';

import { getConfigFilePath, tildeify } from '../../utils/config.utils.js';
import {
  getLastLogEntry,
  getLogFilePath,
  getPlistPath,
  isDaemonInstalled,
  isDaemonRunning,
} from '../../utils/daemon.utils.js';
import type { PrStatus, RepoInfo } from '../../utils/gh.utils.js';
import { assertGhAvailable, fetchMyOpenPrs, fetchRepoInfo } from '../../utils/gh.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';
import { formatPrLines, getPrSummary, terminalLink } from '../../utils/pr-display.utils.js';

const DEFAULT_LIVE_INTERVAL = 5;

interface RunLiveCommandParams {
  argv: string[];
}

interface LiveOptions {
  interval?: number;
  once?: boolean;
}

/**
 * Render the live PR status display.
 */
function renderDisplay(
  { pullRequests, repoInfo, options }: {
    pullRequests: PrStatus[];
    repoInfo: RepoInfo | null;
    options: LiveOptions;
  },
): string {
  const lines: string[] = [];

  // Get timezone offset in format like "GMT+1"
  const now = new Date();
  const tzOffset = -now.getTimezoneOffset() / 60;
  const tzString = `GMT${tzOffset >= 0 ? '+' : ''}${tzOffset}`;

  // Header with 24h time and timezone
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
        } ${tzString}`,
      )
    }`,
  );
  lines.push('');

  // Repo header (clickable to /pulls page) - format: owner/repo in white
  if (repoInfo) {
    const pullsUrl = `${repoInfo.url}/pulls`;
    const repoLink = terminalLink({
      url: pullsUrl,
      label: pc.white(pc.bold(repoInfo.nameWithOwner)),
    });
    lines.push(`  ${repoLink}`);
    lines.push('');
  }

  // PR List with aligned columns
  if (pullRequests.length === 0) {
    lines.push(pc.dim('  No open PRs found'));
  } else {
    const formattedLines = formatPrLines({ prs: pullRequests });
    for (const line of formattedLines) {
      lines.push(`  ${line}`);
    }
  }

  lines.push('');

  // Summary
  if (pullRequests.length > 0) {
    lines.push(`  ${getPrSummary({ pullRequests })}`);
    lines.push('');
  }

  // Metadata Footer
  lines.push(pc.dim('─'.repeat(60)));
  lines.push('');

  // TODO: possible use in future..
  // const config = readConfig();

  const daemonInstalled = isDaemonInstalled();
  const daemonRunning = isDaemonRunning();
  const lastLog = getLastLogEntry();

  // Calculate label width for alignment
  const labels = ['config:', 'repos:', 'daemon:', 'plist', 'logs:', 'last log:'];
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
    lines.push(
      `  ${pc.white('logs:'.padEnd(labelWidth))}  ${pc.dim(tildeify(getLogFilePath()))}`,
    );

    if (lastLog) {
      const truncatedLog = lastLog.length > 60 ? `${lastLog.slice(0, 57)}...` : lastLog;
      lines.push(`  ${pc.white('last log:'.padEnd(labelWidth))}  ${pc.dim(truncatedLog)}`);
    }
  }

  // Config info with aligned labels (white) and values
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
    // Fetch repo info
    let repoInfo: RepoInfo | null = null;
    try {
      repoInfo = fetchRepoInfo();
    } catch {
      // Repo info not critical, continue without it
    }

    // Fetch PRs (non-draft only)
    const allPrs = await fetchMyOpenPrs();
    const pullRequests = allPrs.filter((pr) => !pr.isDraft);

    // Render display
    const output = renderDisplay({ pullRequests, repoInfo, options });

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
  - Config and daemon status
  - Log information`,
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

    // Initial fetch
    await fetchAndDisplay({ options });

    // Set up interval
    const intervalMs = (options.interval || DEFAULT_LIVE_INTERVAL) * 1000;
    setInterval(() => {
      fetchAndDisplay({ options });
    }, intervalMs);

    // Keep process alive
    process.stdin.resume();
  }
}
