import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { CONFIG_DIR } from './config.utils.js';

const LOG_DIR = join(CONFIG_DIR, 'logs');
const LOG_FILE = join(LOG_DIR, 'watch.log');

const MAX_LOG_LINES = 500;

const timestamp = (): string => new Date().toISOString();

export const writeLog = ({ message }: { message: string }): void => {
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, `[${timestamp()}] ${message}\n`, 'utf-8');
  } catch {
    // Silently ignore log failures in background mode
  }
};

export const getLogPath = (): string => LOG_FILE;

export const getMaxLogLines = (): number => MAX_LOG_LINES;
