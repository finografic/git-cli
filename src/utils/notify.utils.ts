import { execSync } from 'node:child_process';

const detectTerminalApp = (): string => {
  const termProgram = process.env['TERM_PROGRAM'];

  if (termProgram === 'iTerm.app') return 'iTerm';
  if (termProgram === 'WarpTerminal') return 'Warp';
  if (termProgram === 'Apple_Terminal') return 'Terminal';

  return 'Terminal';
};

const hasTerminalNotifier = (): boolean => {
  try {
    execSync('which terminal-notifier', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
};

const escapeShellArg = ({ value }: { value: string }): string =>
  `'${value.replace(/'/g, "'\\''")}'`;

export const sendNotification = (
  { title, message, clickCommand }: { title: string; message: string; clickCommand?: string },
): void => {
  if (hasTerminalNotifier()) {
    const terminalApp = detectTerminalApp();
    const args = [
      'terminal-notifier',
      '-title',
      escapeShellArg({ value: title }),
      '-message',
      escapeShellArg({ value: message }),
      '-group',
      "'gli-watch'",
      '-sender',
      "'com.apple.Terminal'",
    ];

    if (clickCommand) {
      args.push('-execute', escapeShellArg({ value: clickCommand }));
      args.push('-activate', escapeShellArg({ value: `com.apple.${terminalApp}` }));
    }

    try {
      execSync(args.join(' '), { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch {
      // Fallback to osascript if terminal-notifier fails
      sendOsascriptNotification({ title, message });
    }
    return;
  }

  sendOsascriptNotification({ title, message });
};

const sendOsascriptNotification = (
  { title, message }: { title: string; message: string },
): void => {
  const escapedTitle = title.replace(/"/g, '\\"');
  const escapedMessage = message.replace(/"/g, '\\"');

  try {
    execSync(
      `osascript -e 'display notification "${escapedMessage}" with title "${escapedTitle}"'`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
  } catch {
    // Silently ignore notification failures in background mode
  }
};
