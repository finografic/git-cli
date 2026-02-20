import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import {
  DEFAULT_CHECK_INTERVAL,
  DEFAULT_LIVE_INTERVAL,
  DEFAULT_PR_TITLE_MAX_CHARS,
} from '../config/defaults.constants.js';
import { DEFAULT_PR_TITLE_SLICE_START } from '../config/ui.constants.js';

export interface RepoConfig {
  localPath: string;
  remote: string;
}

export interface GitCliConfig {
  repos: RepoConfig[];
  checkInterval?: number;
  liveInterval?: number;
  notifyOn?: string[];
  prListing?: {
    title?: {
      display?: boolean;
      maxChars?: number;
      /** Skip N characters from the start of the title before truncating. */
      sliceStart?: number;
    };
  };
}

/**
 * Full defaults written to disk on first run so users can see and edit all options
 * via `gli config edit`.
 */
const FULL_DEFAULT_CONFIG: GitCliConfig = {
  repos: [],
  checkInterval: DEFAULT_CHECK_INTERVAL,
  liveInterval: DEFAULT_LIVE_INTERVAL,
  notifyOn: ['BEHIND', 'DIRTY'],
  prListing: {
    title: {
      display: false,
      maxChars: DEFAULT_PR_TITLE_MAX_CHARS,
      sliceStart: DEFAULT_PR_TITLE_SLICE_START,
    },
  },
};

export const CONFIG_DIR = join(
  process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config'),
  'git-cli',
);

export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export const writeConfig = ({ config }: { config: GitCliConfig }): void => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
};

export const readConfig = (): GitCliConfig => {
  if (!existsSync(CONFIG_PATH)) {
    // First run: write full defaults to disk so user can see all options via `gli config edit`
    writeConfig({ config: FULL_DEFAULT_CONFIG });
    return { ...FULL_DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' || parsed === null
      || !Array.isArray((parsed as GitCliConfig).repos)
    ) {
      return { ...FULL_DEFAULT_CONFIG };
    }

    return parsed as GitCliConfig;
  } catch {
    return { ...FULL_DEFAULT_CONFIG };
  }
};

export const addRepo = ({ localPath, remote }: { localPath: string; remote: string }): void => {
  const config = readConfig();
  const exists = config.repos.some((r) => r.remote === remote);

  if (exists) {
    return;
  }

  config.repos.push({ localPath, remote });
  writeConfig({ config });
};

export const removeRepo = ({ remote }: { remote: string }): void => {
  const config = readConfig();
  config.repos = config.repos.filter((r) => r.remote !== remote);
  writeConfig({ config });
};

export const listRepos = (): RepoConfig[] => {
  const config = readConfig();
  return config.repos;
};

export const getConfigFilePath = (): string => {
  return CONFIG_PATH;
};

export const tildeify = (p: string): string => p.replace(homedir(), '~');
