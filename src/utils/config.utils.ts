import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface RepoConfig {
  localPath: string;
  remote: string;
}

export interface GitCliConfig {
  repos: RepoConfig[];
  checkInterval?: number;
  notifyOn?: string[];
}

const DEFAULT_CONFIG: GitCliConfig = { repos: [] };

export const CONFIG_DIR = join(
  process.env['XDG_CONFIG_HOME'] || join(homedir(), '.config'),
  'git-cli',
);

export const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

export const readConfig = (): GitCliConfig => {
  if (!existsSync(CONFIG_PATH)) {
    return { ...DEFAULT_CONFIG, repos: [] };
  }

  try {
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' || parsed === null
      || !Array.isArray((parsed as GitCliConfig).repos)
    ) {
      return { ...DEFAULT_CONFIG, repos: [] };
    }

    return parsed as GitCliConfig;
  } catch {
    return { ...DEFAULT_CONFIG, repos: [] };
  }
};

export const writeConfig = ({ config }: { config: GitCliConfig }): void => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
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
