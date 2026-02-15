#!/usr/bin/env bash
#
# Create PRs that will show as BEHIND/DIRTY when one is merged.
# This script modifies THE SAME FILE in each PR, so merging one will make others show as needing rebase.
#
# IMPORTANT: For PRs to show as BEHIND/DIRTY, your repository MUST have:
# 1. Branch protection enabled on the base branch (master/main)
# 2. "Require status checks to pass before merging" enabled
# 3. "Require branches to be up to date before merging" enabled (strict mode)
#
# To enable branch protection:
#   gh api --method PUT "/repos/{owner}/{repo}/branches/{branch}/protection" \
#     --input - <<'EOF'
#   {
#     "required_status_checks": {"strict": true, "checks": []},
#     "enforce_admins": false,
#     "required_pull_request_reviews": null,
#     "restrictions": null,
#     "required_linear_history": false,
#     "allow_force_pushes": false,
#     "allow_deletions": false
#   }
#   EOF
#
# Or use the GitHub web UI: Settings → Branches → Branch protection rules
#

set -euo pipefail

REPO="${REPO:-/Users/justin/repos-finografic/@finografic-core}"
RUN_NAME="${1:-behind-$(date +%Y%m%d-%H%M%S)}"
NUM_PRS="${2:-3}"
MERGE_WHICH="${3:-2}"

# The key: all PRs will modify the SAME file!
TEST_FILE="test-behind-${RUN_NAME}.md"

if ! command -v gh &>/dev/null; then
  echo "error: gh (GitHub CLI) is required" >&2
  exit 1
fi

if [[ ! -d "$REPO" ]]; then
  echo "error: REPO not found: $REPO" >&2
  exit 1
fi

cd "$REPO"

# Resolve default branch
DEFAULT_BRANCH="$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)"
echo "Default branch: $DEFAULT_BRANCH"
echo "Test file: $TEST_FILE"
git fetch origin
git checkout "$DEFAULT_BRANCH"
git pull origin "$DEFAULT_BRANCH"

PR_NUMBERS=()
for i in $(seq 1 "$NUM_PRS"); do
  BRANCH="${RUN_NAME}-${i}"

  # Start from base
  git checkout -B "$BRANCH" "$DEFAULT_BRANCH"

  # Each PR modifies the SAME file - this will create conflicts!
  echo "# Test PR $i from run $RUN_NAME" > "$TEST_FILE"
  echo "" >> "$TEST_FILE"
  echo "This is PR number $i." >> "$TEST_FILE"
  echo "Branch: \`$BRANCH\`" >> "$TEST_FILE"
  echo "When another PR modifying this file is merged, this PR will show as BEHIND." >> "$TEST_FILE"

  git add "$TEST_FILE"
  git commit -m "chore(test): PR $i modifies $TEST_FILE"
  git push -u origin "$BRANCH"

  gh pr create \
    --title "Behind test PR $i ($RUN_NAME)" \
    --body "Auto-generated to test BEHIND status. All PRs modify \`$TEST_FILE\`."

  PR_NUM="$(gh pr list --head "$BRANCH" --json number -q '.[0].number' 2>/dev/null || true)"
  if [[ -n "${PR_NUM:-}" ]]; then
    PR_NUMBERS+=( "$PR_NUM" )
    echo "Created PR #$PR_NUM (branch $BRANCH)"
  fi

  git checkout "$DEFAULT_BRANCH"
done

# Merge one PR
IDX=$((MERGE_WHICH - 1))
if [[ "$MERGE_WHICH" -ge 1 && "$MERGE_WHICH" -le "$NUM_PRS" && -n "${PR_NUMBERS[IDX]:-}" ]]; then
  MERGE_PR="${PR_NUMBERS[IDX]}"
  echo ""
  echo "Merging PR #$MERGE_PR..."
  gh pr merge "$MERGE_PR" --merge
  echo ""
  echo "✓ Merged PR #$MERGE_PR"
  echo ""
  echo "The remaining PRs should now show as BEHIND (excluding the merged #$MERGE_PR)"
  echo "because they all modify the same file ($TEST_FILE)."
  echo ""
  echo "Run 'gli live' to see them marked as '⚠ Behind base branch — rebase needed'"
else
  echo "Skipping merge. Merge one manually to make others behind."
fi

echo ""
echo "Done. Run name: $RUN_NAME"
echo "Branches: ${RUN_NAME}-1 .. ${RUN_NAME}-${NUM_PRS}"
echo "File modified by all PRs: $TEST_FILE"
