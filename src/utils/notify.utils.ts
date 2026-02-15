import { execSync } from 'node:child_process';

/**
 * Send macOS notification using native osascript.
 * No external dependencies required.
 */
export function sendNotification({ title, message }: { title: string; message: string }): void {
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
}
