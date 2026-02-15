#!/usr/bin/env bash
#
# Create multiple PRs from the same base, then merge one so the others become stale.
# Use case: testing rebase / "update branch" workflows.
#
# Usage:
#   ./create-stale-prs.sh [RUN_NAME] [NUM_PRS] [MERGE_WHICH]
#
# Examples:
#   ./create-stale-prs.sh                    # run-YYYYMMDD-HHMMSS, 3 PRs, merge #2
#   ./create-stale-prs.sh my-test 4 3        # 4 PRs, merge #3 (so 1,2,4 are stale)
#
# Requires: gh (GitHub CLI), repo REPO with push access.
#
set -euo pipefail

REPO="${REPO:-/Users/justin/repos-finografic/@finografic-core}"
RUN_NAME="${1:-stale-$(date +%Y%m%d-%H%M%S)}"
NUM_PRS="${2:-3}"
MERGE_WHICH="${3:-2}"
SUBDIR="test-rebase-${RUN_NAME}"

if ! command -v gh &>/dev/null; then
  echo "error: gh (GitHub CLI) is required" >&2
  exit 1
fi

if [[ ! -d "$REPO" ]]; then
  echo "error: REPO not found: $REPO" >&2
  exit 1
fi

cd "$REPO"

# Resolve default branch (master or main)
DEFAULT_BRANCH="$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|^refs/remotes/origin/||' || echo master)"
echo "Default branch: $DEFAULT_BRANCH"
git fetch origin
git checkout "$DEFAULT_BRANCH"
git pull origin "$DEFAULT_BRANCH"

PR_NUMBERS=()
for i in $(seq 1 "$NUM_PRS"); do
  BRANCH="${RUN_NAME}-${i}"
  FILE="${SUBDIR}/${i}.md"
  git checkout -B "$BRANCH" "$DEFAULT_BRANCH"
  mkdir -p "$(dirname "$FILE")"
  echo "# Stale test PR $i — $RUN_NAME" > "$FILE"
  echo "" >> "$FILE"
  echo "Branch: \`$BRANCH\`. Created by create-stale-prs.sh." >> "$FILE"
  git add "$FILE"
  git commit -m "chore(rebase-test): add $FILE"
  git push -u origin "$BRANCH"
  gh pr create --title "Stale test PR $i ($RUN_NAME)" --body "Auto-generated for rebase tool testing. Branch: \`$BRANCH\`."
  PR_NUM="$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>/dev/null || true)"
  if [[ -n "${PR_NUM:-}" ]]; then
    PR_NUMBERS+=( "$PR_NUM" )
    echo "Created PR #$PR_NUM (branch $BRANCH)"
  else
    echo "Created branch $BRANCH (PR may have been created; check GitHub)" >&2
  fi
  git checkout "$DEFAULT_BRANCH"
done

# Merge the chosen PR so the others become stale
IDX=$((MERGE_WHICH - 1))
if [[ "$MERGE_WHICH" -ge 1 && "$MERGE_WHICH" -le "$NUM_PRS" && -n "${PR_NUMBERS[IDX]:-}" ]]; then
  MERGE_PR="${PR_NUMBERS[IDX]}"
  echo ""
  echo "Merging PR #$MERGE_PR so the other PRs become stale..."
  gh pr merge "$MERGE_PR" --merge
  echo "Merged PR #$MERGE_PR. Other PRs should now show as out-of-date with the base branch."
else
  echo "Skipping merge (MERGE_WHICH=$MERGE_WHICH, valid range 1..$NUM_PRS). Merge one manually to make others stale."
fi

echo ""
echo "Done. Run name: $RUN_NAME"
echo "Branches: ${RUN_NAME}-1 .. ${RUN_NAME}-${NUM_PRS}"
echo "Files: $SUBDIR/1.md .. $SUBDIR/${NUM_PRS}.md"
echo "To clean up later: delete branches and close PRs for run \`$RUN_NAME\`, and remove folder \`$SUBDIR\` from $DEFAULT_BRANCH."
