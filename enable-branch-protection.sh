#!/usr/bin/env bash
#
# Enable branch protection for master/main branch to make PRs show as BEHIND when base moves forward.
#

set -euo pipefail

REPO="${REPO:-/Users/justin/repos-finografic/@finografic-core}"

if [[ ! -d "$REPO" ]]; then
  echo "error: REPO not found: $REPO" >&2
  exit 1
fi

cd "$REPO"

# Get repo owner/name
REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner)
DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)

echo "Repository: $REPO_FULL"
echo "Default branch: $DEFAULT_BRANCH"
echo ""
echo "Enabling branch protection with 'require branches to be up to date'..."

# Enable branch protection with the key setting
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "/repos/${REPO_FULL}/branches/${DEFAULT_BRANCH}/protection" \
  -f required_status_checks='{"strict":true,"contexts":[]}' \
  -F enforce_admins=false \
  -F required_pull_request_reviews=null \
  -F restrictions=null \
  -F required_linear_history=false \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F required_conversation_resolution=false

echo ""
echo "✓ Branch protection enabled!"
echo "PRs will now show as BEHIND when the base branch has new commits."
