import { cwd } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { addRepo, getConfigFilePath, listRepos, removeRepo } from '../../utils/config.utils.js';
import { getGitHubUrlFromPath, isGitRepo } from '../../utils/git.utils.js';
import { printCommandHelp } from '../../utils/help.utils.js';

interface RunConfigCommandParams {
  argv: string[];
}

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/;

const printHelp = () => {
  printCommandHelp({
    command: 'gli config',
    description: 'Manage multi-repo configuration',
    usage: 'gli config <subcommand>',
    subcommands: [
      { name: 'add', description: 'Add a repository to the config' },
      { name: 'list', description: 'List all configured repositories' },
      { name: 'remove', description: 'Remove a repository from the config' },
      { name: 'path', description: 'Show the config file path' },
    ],
    examples: [
      { command: 'gli config add', description: 'Add current directory' },
      { command: 'gli config list', description: 'Show all repos' },
      { command: 'gli config remove', description: 'Remove a repo' },
      { command: 'gli config path', description: 'Show config file location' },
    ],
  });
};

const runAddRepo = async () => {
  clack.intro('Add Repo');

  const currentPath = cwd();
  const isCurrentGitRepo = isGitRepo({ path: currentPath });

  // Try to get GitHub URL from current directory if it's a git repo
  const autoDetectedUrl = isCurrentGitRepo
    ? getGitHubUrlFromPath({ localPath: currentPath })
    : null;

  const localPath = await clack.text({
    message: 'Local repository path',
    placeholder: currentPath,
    initialValue: autoDetectedUrl ? currentPath : '',
    defaultValue: currentPath,
  });

  if (clack.isCancel(localPath)) {
    clack.outro('Cancelled');
    return;
  }

  const pathToUse = (localPath as string) || currentPath;

  // Auto-detect GitHub URL for the selected path
  const detectedUrl = getGitHubUrlFromPath({ localPath: pathToUse });

  const remote = await clack.text({
    message: 'GitHub repository URL',
    placeholder: 'https://github.com/owner/repo',
    initialValue: detectedUrl || '',
    validate: (value = '') => {
      if (!GITHUB_URL_PATTERN.test(value)) {
        return 'Must be a valid GitHub URL (e.g. https://github.com/owner/repo)';
      }
    },
  });

  if (clack.isCancel(remote)) {
    clack.outro('Cancelled');
    return;
  }

  addRepo({ localPath: pathToUse, remote });
  clack.log.success(`Added ${pc.cyan(remote)}`);
  clack.log.info(`  ${pc.dim(pathToUse)}`);
  clack.outro('Done');
};

const runList = () => {
  const repos = listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Run `gli config add` to add one.');
    return;
  }

  clack.intro('Configured Repos');

  for (const repo of repos) {
    clack.log.message(`${pc.bold(repo.remote)}\n  ${pc.dim(repo.localPath)}`);
  }

  clack.outro(`${repos.length} repo${repos.length === 1 ? '' : 's'} configured`);
};

const runRemoveRepo = async () => {
  const repos = listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Nothing to remove.');
    return;
  }

  clack.intro('Remove Repo');

  const selected = await clack.select({
    message: 'Which repo do you want to remove?',
    options: repos.map((repo) => ({
      value: repo.remote,
      label: repo.remote,
      hint: repo.localPath,
    })),
  });

  if (clack.isCancel(selected)) {
    clack.outro('Cancelled');
    return;
  }

  removeRepo({ remote: selected });
  clack.log.success(`Removed ${pc.bold(selected)}`);
  clack.outro('Done');
};

const runPath = () => {
  console.log(getConfigFilePath());
};

export const runConfigCommand = async ({ argv }: RunConfigCommandParams) => {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (subcommand === 'add') {
    await runAddRepo();
    return;
  }

  if (subcommand === 'list') {
    runList();
    return;
  }

  if (subcommand === 'remove') {
    await runRemoveRepo();
    return;
  }

  if (subcommand === 'path') {
    runPath();
    return;
  }

  console.error(`Unknown config subcommand: ${subcommand}`);
  printHelp();
};
