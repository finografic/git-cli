# @finografic/git-cli

Git utilities for monitoring and managing PRs from the terminal. Built on the GitHub CLI (`gh`).

## Installation

```bash
pnpm add -g @finografic/git-cli
```

Or clone and link locally:

```bash
pnpm install && pnpm link --global
```

## Commands

```
gli <command>

  config  Manage multi-repo configuration
  rebase  Interactively rebase branches that are behind
  select  Interactively checkout a branch for one of your PRs
  status  Show merge status of your open PRs
  watch   Background PR monitoring with macOS notifications
```

### `gli status`

Show the merge status of your open PRs, grouped by state (behind, dirty, blocked, clean).

```bash
gli status          # Current repo
gli status --all    # All configured repos
```

### `gli rebase`

Interactively rebase branches that are behind the default branch, then push with `--force-with-lease`.

```bash
gli rebase              # Select a branch to rebase
gli rebase --all        # Rebase all stale branches (with confirmation)
gli rebase --dry-run    # Preview without executing
```

### `gli config`

Manage the multi-repo configuration stored at `~/.config/git-cli/config.json`.

```bash
gli config add-repo      # Add a repo (owner/repo format)
gli config list          # List configured repos
gli config remove-repo   # Remove a repo interactively
```

### `gli watch`

Background PR monitoring via macOS LaunchAgent. Sends native notifications when PRs need rebasing.

```bash
gli watch install      # Install the LaunchAgent (checks every 15 min)
gli watch uninstall    # Remove the LaunchAgent
gli watch status       # Show agent status
gli watch check        # Run a one-off check
```

Install [`terminal-notifier`](https://github.com/julienXX/terminal-notifier) for clickable notifications: `brew install terminal-notifier`

### `gli select`

Interactively checkout a branch from one of your open PRs.

```bash
gli select
```

## Prerequisites

- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)

## Development

```bash
pnpm install        # Install dependencies (sets up git hooks)
pnpm dev            # Watch mode
pnpm build          # Build
pnpm test.run       # Tests
pnpm lint           # Lint
```

See [docs/DEVELOPER_WORKFLOW.md](./docs/DEVELOPER_WORKFLOW.md) for the complete workflow.

## License

MIT &copy; [Justin Rankin / @finografic](https://github.com/finografic)
