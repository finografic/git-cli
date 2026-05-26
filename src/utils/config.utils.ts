import { existsSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { readJsonc, writeJsonc } from '@finografic/cli-kit/xdg';

import { FULL_DEFAULT_CONFIG } from 'config/defaults.constants.js';
import { CONFIG_FILE, LEGACY_CONFIG_FILE_DIR } from 'config/paths.constants.js';
import type { GliConfiguration, JiraConfig } from 'types/config.types.js';

const LEGACY_CONFIG_FILE = join(LEGACY_CONFIG_FILE_DIR, 'config.json');

async function migrateLegacyConfig(): Promise<void> {
  if (existsSync(CONFIG_FILE) || !existsSync(LEGACY_CONFIG_FILE)) return;
  await mkdir(dirname(CONFIG_FILE), { recursive: true });
  await rename(LEGACY_CONFIG_FILE, CONFIG_FILE);
}

/** True when `jira.baseUrl` is a non-empty string (after trim). */
export function isJiraLinksEnabled(jira?: JiraConfig | null): boolean {
  return typeof jira?.baseUrl === 'string' && jira.baseUrl.trim().length > 0;
}

export async function writeConfig({ config }: { config: GliConfiguration }): Promise<void> {
  await writeJsonc(CONFIG_FILE, config);
}

export async function readConfig(): Promise<GliConfiguration> {
  await migrateLegacyConfig();
  const parsed = await readJsonc<unknown>(CONFIG_FILE);

  if (parsed === null) {
    // First run → persist defaults so users can inspect/edit them
    await writeConfig({ config: FULL_DEFAULT_CONFIG });
    return { ...FULL_DEFAULT_CONFIG };
  }

  const legacyJiraBaseUrl = isRecord(parsed) ? parsed['jiraBaseUrl'] : undefined;

  if (!isValidConfig(parsed)) {
    return { ...FULL_DEFAULT_CONFIG };
  }

  const config = parsed as GliConfiguration;

  if (!config.jira && typeof legacyJiraBaseUrl === 'string' && legacyJiraBaseUrl.trim().length > 0) {
    return {
      ...config,
      jira: { baseUrl: legacyJiraBaseUrl.trim() },
    };
  }

  return config;
}

/** Narrow unknown → GliConfiguration (minimal structural check). */
function isValidConfig(value: unknown): value is GliConfiguration {
  return typeof value === 'object' && value !== null && Array.isArray((value as GliConfiguration).repos);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

export function tildeify(path: string): string {
  return path.replace(homedir(), '~');
}
