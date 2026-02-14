import { cwd } from 'node:process';

import * as clack from '@clack/prompts';
import pc from 'picocolors';

import { addRepo, listRepos, removeRepo } from '../../utils/config.utils.js';

interface RunConfigCommandParams {
  argv: string[];
}

const REMOTE_PATTERN = /^[\w.-]+\/[\w.-]+$/;

const printHelp = () => {
  console.log(
    'Usage:\n  gli config <subcommand>\n\nSubcommands:\n  add-repo     Add a repo to track\n  list         List configured repos\n  remove-repo  Remove a configured repo\n',
  );
};

const runAddRepo = async () => {
  clack.intro('Add Repo');

  const remote = await clack.text({
    message: 'Repository remote (owner/repo)',
    placeholder: 'owner/repo',
    validate: (value = '') => {
      if (!REMOTE_PATTERN.test(value)) {
        return 'Must be in owner/repo format (e.g. octocat/hello-world)';
      }
    },
  });

  if (clack.isCancel(remote)) {
    clack.outro('Cancelled');
    return;
  }

  const localPath = await clack.text({
    message: 'Local path (optional, defaults to cwd)',
    placeholder: cwd(),
    defaultValue: cwd(),
  });

  if (clack.isCancel(localPath)) {
    clack.outro('Cancelled');
    return;
  }

  addRepo({ localPath, remote });
  clack.log.success(`Added ${pc.bold(remote)}`);
  clack.outro('Done');
};

const runList = () => {
  const repos = listRepos();

  if (repos.length === 0) {
    clack.log.info('No repos configured. Run `gli config add-repo` to add one.');
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

export const runConfigCommand = async ({ argv }: RunConfigCommandParams) => {
  const [subcommand] = argv;

  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printHelp();
    return;
  }

  if (subcommand === 'add-repo') {
    await runAddRepo();
    return;
  }

  if (subcommand === 'list') {
    runList();
    return;
  }

  if (subcommand === 'remove-repo') {
    await runRemoveRepo();
    return;
  }

  console.error(`Unknown config subcommand: ${subcommand}`);
  printHelp();
};
