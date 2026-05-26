import { createXdgPaths } from '@finografic/cli-kit/xdg';

const xdg = createXdgPaths();

export const CONFIG_PATH = xdg.configDir();
export const CONFIG_FILE = xdg.configPath('gli');
export const CACHE_FILE = xdg.cachePath('gli');

/** Legacy config path — used for one-time migration to the new location. */
export const LEGACY_CONFIG_FILE_DIR = CONFIG_PATH.replace(/\/finografic$/, '/gli');
