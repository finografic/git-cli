# `gli status` — PR Merge Status

Shows the merge status of your open PRs in the current repository, highlighting branches that need a rebase.

## Usage

```bash
gli status
```

## What It Does

1. Checks that the GitHub CLI (`gh`) is installed and authenticated
2. Fetches your open PRs (authored by `@me`) via `gh pr list`
3. Filters out draft PRs
4. Groups and displays PRs by merge-state priority:

| Status    | Indicator                    | Meaning                        |
| --------- | ---------------------------- | ------------------------------ |
| `BEHIND`  | `⚠ Behind — rebase needed`  | Base branch has newer commits  |
| `DIRTY`   | `✗ Diverged — rebase needed` | Conflicts with base branch     |
| `BLOCKED` | `○ Blocked`                  | Merge requirements not met     |
| `UNSTABLE` | `○ CI running or failed`    | Checks haven't passed yet      |
| `UNKNOWN` | `? Status pending`           | GitHub hasn't computed status  |
| `CLEAN`   | `✓ Up to date`               | Ready to merge                 |

5. Prints a summary line (e.g. `3 open PRs · 2 need rebase`)
6. Offers an interactive prompt to open any PR in the browser

## Prerequisites

- [GitHub CLI](https://cli.github.com) installed and authenticated (`gh auth login`)
- Run from inside a GitHub-hosted git repository

## Flags

| Flag          | Description        |
| ------------- | ------------------ |
| `--help`, `-h` | Show usage info   |
