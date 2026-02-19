import pc from 'picocolors';

import type { PrStatus } from './gh.utils.js';

interface StatusDisplay {
  symbol: string;
  color: (text: string) => string;
  label: string;
}

/**
 * Get build status display (CI checks) for a PR.
 */
export function getBuildStatusDisplay({ pr }: { pr: PrStatus }): StatusDisplay {
  const checks = pr.statusCheckRollup;

  if (checks.length === 0) {
    return { symbol: '—', color: pc.dim, label: 'No CI' };
  }

  const isBuilding = checks.some((c) => c.status === 'IN_PROGRESS' || c.status === 'QUEUED');
  if (isBuilding) {
    return { symbol: '⋯', color: pc.dim, label: 'Building' };
  }

  const hasFailed = checks.some(
    (c) => c.conclusion === 'FAILURE' || c.conclusion === 'ERROR' || c.conclusion === 'TIMED_OUT',
  );
  if (hasFailed) {
    return { symbol: '✗', color: pc.red, label: 'Failed' };
  }

  return { symbol: '✓', color: pc.green, label: 'Passed' };
}

/**
 * Get approval status display (review decision + merge readiness) for a PR.
 */
export function getApprovalStatusDisplay({ pr }: { pr: PrStatus }): StatusDisplay {
  if (pr.mergeStateStatus === 'DIRTY') {
    return { symbol: '✗', color: pc.red, label: 'Conflicts' };
  }

  if (pr.mergeStateStatus === 'BEHIND') {
    return { symbol: '⚠', color: pc.yellow, label: 'Rebase needed' };
  }

  switch (pr.reviewDecision) {
    case 'APPROVED': {
      return { symbol: '✓', color: pc.green, label: 'Approved' };
    }
    case 'CHANGES_REQUESTED': {
      return { symbol: '○', color: pc.red, label: "Changes req'd" };
    }
    case 'REVIEW_REQUIRED': {
      return { symbol: '○', color: pc.dim, label: 'Awaiting review' };
    }
    default: {
      return { symbol: '—', color: pc.dim, label: 'No review req.' };
    }
  }
}

/**
 * Create a clickable terminal link (if supported).
 */
export function terminalLink({ url, label }: { url: string; label: string }): string {
  // OSC 8 hyperlink format: \x1b]8;;URL\x1b\\TEXT\x1b]8;;\x1b\\
  return `\x1b]8;;${url}\x1b\\${label}\x1b]8;;\x1b\\`;
}

/**
 * Format a single PR line for display with proper column alignment.
 */
export function formatPrLine(
  { pr, prNumWidth = 0, branchWidth = 0, titleWidth = 0, buildWidth = 0 }: {
    pr: PrStatus;
    prNumWidth?: number;
    branchWidth?: number;
    titleWidth?: number;
    buildWidth?: number;
  },
): string {
  // PR number with "PR#" prefix in white (clickable)
  const prNumText = `PR#${pr.number}`;
  const prNumber = terminalLink({ url: pr.url, label: pc.white(prNumText) });

  // Branch name in cyan
  const branch = pc.cyan(pr.headRefName);

  // Build status column
  const buildDisplay = getBuildStatusDisplay({ pr });
  const buildText = `${buildDisplay.symbol} ${buildDisplay.label}`;
  const buildStatusText = buildDisplay.color(buildText);

  // Approval status column
  const approvalDisplay = getApprovalStatusDisplay({ pr });
  const approvalText = `${approvalDisplay.symbol} ${approvalDisplay.label}`;
  const approvalStatusText = approvalDisplay.color(approvalText);

  // Calculate padding (accounting for color codes that don't take space)
  const prNumPadding = prNumWidth > 0 ? prNumWidth - prNumText.length : 0;
  const branchPadding = branchWidth > 0 ? branchWidth - pr.headRefName.length : 0;
  const buildPadding = buildWidth > 0 ? buildWidth - buildText.length : 0;

  // Optional title column
  let titlePart = '';
  if (titleWidth > 0) {
    const truncated = pr.title.length > titleWidth
      ? `${pr.title.slice(0, titleWidth - 1)}…`
      : pr.title;
    titlePart = `  ${pc.dim(truncated)}${' '.repeat(titleWidth - truncated.length)}`;
  }

  return `${prNumber}${' '.repeat(prNumPadding)}  ${branch}${
    ' '.repeat(branchPadding)
  }${titlePart}  ${buildStatusText}${' '.repeat(buildPadding)}  ${approvalStatusText}`;
}

/**
 * Format multiple PR lines with aligned columns.
 */
export function formatPrLines(
  { prs, showTitle = false, titleMaxChars = 40 }: {
    prs: PrStatus[];
    showTitle?: boolean;
    titleMaxChars?: number;
  },
): string[] {
  if (prs.length === 0) return [];

  // Calculate column widths
  const prNumWidth = Math.max(...prs.map((pr) => `PR#${pr.number}`.length));
  const branchWidth = Math.max(...prs.map((pr) => pr.headRefName.length));
  const titleWidth = showTitle
    ? Math.min(titleMaxChars, Math.max(...prs.map((pr) => pr.title.length)))
    : 0;
  const buildWidth = Math.max(
    ...prs.map((pr) => {
      const d = getBuildStatusDisplay({ pr });
      return `${d.symbol} ${d.label}`.length;
    }),
  );

  return prs.map((pr) => formatPrLine({ pr, prNumWidth, branchWidth, titleWidth, buildWidth }));
}

/**
 * Get summary line for PR list.
 */
export function getPrSummary({ pullRequests }: { pullRequests: PrStatus[] }): string {
  const needsRebaseCount = pullRequests.filter(
    (pr) => pr.mergeStateStatus === 'BEHIND' || pr.mergeStateStatus === 'DIRTY',
  ).length;

  /*
  const total = pullRequests.length;
  const totalText = pc.bold(`${total} open PR${total === 1 ? '' : 's'}`);

  if (needsRebaseCount === 0) {
    return `${totalText} ${pc.dim('·')} ${pc.green('all up to date')}`;
  }
  */

  const needsRebaseText = pc.yellow(
    `${needsRebaseCount} need${needsRebaseCount === 1 ? 's' : ''} rebase`,
  );

  // return `${totalText} ${pc.dim('·')} ${needsRebaseText}`;
  return needsRebaseText;
}
