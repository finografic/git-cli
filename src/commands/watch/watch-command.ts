import { execSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exit } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { readConfig } from '../../utils/config.utils.js';
import { assertGhAvailable, fetchMyOpenPrs } from '../../utils/gh.utils.js';
import { getLogPath, writeLog } from '../../utils/log.utils.js';
import { sendNotification } from '../../utils/notify.utils.js';

interface RunWatchCommandParams {
  argv: string[];
}

const PLIST_LABEL = 'com.finografic.git-cli.pr-watch';
const PLIST_DIR = join(homedir(), 'Library', 'LaunchAgents');
const PLIST_PATH = join(PLIST_DIR, `${PLIST_LABEL}.plist`);

const DEFAULT_CHECK_INTERVAL = 900;

const resolveCliBin = (): string => {
  try {
    return execSync('which gli', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch {
    // Fallback: try to find via npm/pnpm global
    try {
      return execSync('which git-cli', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch {
      throw new Error('Could not find `gli` or `git-cli` on PATH. Run `pnpm link --global` first.');
    }
  }
};

const generatePlist = ({ binPath, interval }: { binPath: string; interval: number }): string =>
  `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${PLIST_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${binPath}</string>
    <string>watch</string>
    <string>check</string>
  </array>
  <key>StartInterval</key>
  <integer>${interval}</integer>
  <key>RunAtLoad</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/${PLIST_LABEL}.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/${PLIST_LABEL}.stderr.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
`;

const isAgentLoaded = (): boolean => {
  try {
    const output = execSync(`launchctl list ${PLIST_LABEL}`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return output.includes(PLIST_LABEL);
  } catch {
    return false;
  }
};

const printHelp = () => {
  console.log(
    'Usage:\n  gli watch <subcommand>\n\n'
    + 'Subcommands:\n'
    + '  install    Install the LaunchAgent for periodic PR checks\n'
    + '  uninstall  Remove the LaunchAgent\n'
    + '  status     Show whether the agent is running\n'
    + '  check      Run a one-off PR check with notifications (used by LaunchAgent)\n',
  );
};

const runInstall = () => {
  clack.intro('Watch Install');

  const config = readConfig();

  if (config.repos.length === 0) {
    clack.log.warn('No repos configured. Run `gli config add-repo` first.');
    clack.outro('Aborted');
    return;
  }

  let binPath: string;
  try {
    binPath = resolveCliBin();
  } catch (error: unknown) {
    clack.log.error(error instanceof Error ? error.message : 'Could not find CLI binary.');
    clack.outro('Aborted');
    return;
  }

  const interval = config.checkInterval || DEFAULT_CHECK_INTERVAL;
  const plist = generatePlist({ binPath, interval });

  if (isAgentLoaded()) {
    try {
      execSync(`launchctl unload ${PLIST_PATH}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      // May not be loaded
    }
  }

  writeFileSync(PLIST_PATH, plist, 'utf-8');
  clack.log.info(`Plist written to ${pc.dim(PLIST_PATH)}`);

  try {
    execSync(`launchctl load ${PLIST_PATH}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    clack.log.success('LaunchAgent loaded');
  } catch (error: unknown) {
    clack.log.error(`Failed to load agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    clack.outro('Install failed');
    return;
  }

  clack.log.info(`Checking ${pc.bold(String(config.repos.length))} repo${config.repos.length === 1 ? '' : 's'} every ${pc.bold(String(interval))}s`);
  clack.log.info(`Logs: ${pc.dim(getLogPath())}`);
  clack.outro('Watch installed');
};

const runUninstall = () => {
  clack.intro('Watch Uninstall');

  if (!existsSync(PLIST_PATH)) {
    clack.log.info('LaunchAgent is not installed.');
    clack.outro('Done');
    return;
  }

  if (isAgentLoaded()) {
    try {
      execSync(`launchctl unload ${PLIST_PATH}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      clack.log.success('LaunchAgent unloaded');
    } catch (error: unknown) {
      clack.log.warn(`Failed to unload agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  try {
    rmSync(PLIST_PATH);
    clack.log.success('Plist removed');
  } catch (error: unknown) {
    clack.log.error(`Failed to remove plist: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  clack.outro('Watch uninstalled');
};

const runStatus = () => {
  clack.intro('Watch Status');

  if (!existsSync(PLIST_PATH)) {
    clack.log.info('LaunchAgent is not installed. Run `gli watch install` to set up.');
    clack.outro('Done');
    return;
  }

  const loaded = isAgentLoaded();
  clack.log.info(`Agent: ${loaded ? pc.green('loaded') : pc.yellow('not loaded')}`);
  clack.log.info(`Plist: ${pc.dim(PLIST_PATH)}`);

  const config = readConfig();
  const interval = config.checkInterval || DEFAULT_CHECK_INTERVAL;
  clack.log.info(`Interval: ${pc.bold(String(interval))}s · Repos: ${pc.bold(String(config.repos.length))}`);

  const logPath = getLogPath();
  if (existsSync(logPath)) {
    try {
      const logContent = readFileSync(logPath, 'utf-8');
      const lines = logContent.trim().split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        clack.log.info(`Last log: ${pc.dim(lastLine)}`);
      }
    } catch {
      // Ignore read errors
    }
  }

  clack.outro('Done');
};

const runCheck = () => {
  writeLog({ message: 'Check started' });

  try {
    assertGhAvailable();
  } catch {
    writeLog({ message: 'gh CLI not available, skipping check' });
    return;
  }

  const config = readConfig();

  if (config.repos.length === 0) {
    writeLog({ message: 'No repos configured, skipping check' });
    return;
  }

  const notifyOn = config.notifyOn || ['BEHIND', 'DIRTY'];
  const stalePrs: { repo: string; number: number; title: string }[] = [];

  for (const repo of config.repos) {
    try {
      const prs = fetchMyOpenPrs({ repo: repo.remote });
      const stale = prs.filter(
        (pr) => !pr.isDraft && notifyOn.includes(pr.mergeStateStatus),
      );

      for (const pr of stale) {
        stalePrs.push({ repo: repo.remote, number: pr.number, title: pr.title });
      }

      writeLog({ message: `${repo.remote}: ${prs.length} PRs, ${stale.length} stale` });
    } catch (error: unknown) {
      writeLog({ message: `${repo.remote}: error — ${error instanceof Error ? error.message : 'Unknown'}` });
    }
  }

  if (stalePrs.length === 0) {
    writeLog({ message: 'No stale PRs found' });
    return;
  }

  if (stalePrs.length === 1) {
    const pr = stalePrs[0]!;
    sendNotification({
      title: 'PR needs rebase',
      message: `${pr.repo}: #${pr.number} ${pr.title}`,
      clickCommand: 'gli status --all',
    });
  } else {
    const repos = [...new Set(stalePrs.map((pr) => pr.repo))];
    sendNotification({
      title: `${stalePrs.length} PRs need rebase`,
      message: `Across ${repos.join(', ')}`,
      clickCommand: 'gli status --all',
    });
  }

  writeLog({ message: `Check complete — ${stalePrs.length} stale PR${stalePrs.length === 1 ? '' : 's'} notified` });
};

export const runWatchCommand = async ({ argv }: RunWatchCommandParams) => {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (subcommand === 'install') {
    runInstall();
    return;
  }

  if (subcommand === 'uninstall') {
    runUninstall();
    return;
  }

  if (subcommand === 'status') {
    runStatus();
    return;
  }

  if (subcommand === 'check') {
    runCheck();
    return;
  }

  console.error(`Unknown watch subcommand: ${subcommand}`);
  printHelp();
  exit(1);
};
