# 🦋 @finografic/git-cli

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

```text
gli <command>

  live    Live-updating PR status dashboard (⭐ FEATURE)
  status  Show merge status of your open PRs
  select  Interactively checkout a branch for one of your PRs
  config  Manage multi-repo configuration
  watch   Background PR monitoring with macOS notifications
  rebase  Interactively rebase branches that are behind
```

### `gli live` ⭐

Live-updating terminal dashboard for PR status monitoring (like htop, but for your PRs).

```bash
gli live                  # Start live dashboard (refreshes every 10s)
gli live --interval 5     # Refresh every 5 seconds
gli live --once           # Run once and exit (no live updates)
```

Perfect for keeping a terminal panel open to monitor your pull requests in real-time. Shows:

- PR list with status indicators (✓ up to date, ⚠ needs rebase, ✗ conflicts)
- Clickable PR numbers and repo names
- Summary of PRs needing attention
- Config and daemon status

### `gli status`

Show a snapshot of your PR merge status (like `gli live --once` but without metadata).

```bash
gli status          # Current repo
gli status --all    # All configured repos
```

### `gli rebase`

Interactively rebase branches that are behind the default branch. Combines the best of both worlds: shows full PR status, steps through each branch, prompts for force-push confirmation.

```bash
gli rebase                  # Select a branch to rebase
gli rebase --all            # Rebase all stale branches (step-through)
gli rebase -i               # Interactive rebase (manual pick/squash/edit)
gli rebase -s               # Auto-squash multiple commits into one
gli rebase --all --stay     # Rebase all, stay on last branch
gli rebase --dry-run        # Preview without executing
```

**Features:**

- Shows ALL PRs (not just stale) for full context
- Force-push confirmation after each successful rebase
- Step-through flow with [1/3] progress indicators
- Abort handling: continue to next branch or exit
- Interactive mode (`-i`) for manual commit editing
- Auto-squash (`-s`) for cleaning up commit history
- Returns to original branch (unless `--stay` flag)

### `gli config`

Manage the multi-repo configuration stored at `~/.config/git-cli/config.json`.

```bash
gli config add       # Add a repo (auto-detects current repo)
gli config list      # List configured repos
gli config remove    # Remove a repo interactively
gli config path      # Show config file path
```

### `gli watch`

Background PR monitoring via macOS LaunchAgent. Sends native notifications showing repo, branch, and status when PRs need attention.

```bash
gli watch install      # Install the LaunchAgent (checks every 60s)
gli watch uninstall    # Remove the LaunchAgent
gli watch status       # Show agent status
gli watch check        # Run a one-off check
```

Notifications show detailed PR information - see alert, then run `gli live` for interactive dashboard.

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
