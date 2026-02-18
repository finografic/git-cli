import { execSync } from 'node:child_process';

export interface PrStatus {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  mergeStateStatus: string;
  mergeable: string;
  isDraft: boolean;
  updatedAt: string;
  url: string;
}

interface GhPrListItem {
  number: number;
  title: string;
  headRefName: string;
  baseRefName: string;
  mergeStateStatus: string;
  mergeable: string;
  isDraft: boolean;
  updatedAt: string;
  url: string;
}

export const assertGhAvailable = (): void => {
  try {
    execSync('gh auth status', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    throw new Error(
      'GitHub CLI (gh) is not installed or not authenticated.\n'
        + 'Install: https://cli.github.com\n'
        + 'Authenticate: gh auth login',
    );
  }
};

const parsePrListJson = ({ output }: { output: string }): PrStatus[] => {
  const parsed: unknown = JSON.parse(output);
  if (!Array.isArray(parsed)) {
    throw new Error('Unexpected output from `gh pr list` (expected JSON array).');
  }

  return parsed
    .map((item): PrStatus | null => {
      const maybeItem = item as Partial<GhPrListItem>;
      if (
        typeof maybeItem.number !== 'number'
        || typeof maybeItem.title !== 'string'
        || typeof maybeItem.headRefName !== 'string'
        || typeof maybeItem.baseRefName !== 'string'
        || typeof maybeItem.mergeStateStatus !== 'string'
        || typeof maybeItem.mergeable !== 'string'
        || typeof maybeItem.isDraft !== 'boolean'
        || typeof maybeItem.updatedAt !== 'string'
        || typeof maybeItem.url !== 'string'
      ) {
        return null;
      }

      return {
        number: maybeItem.number,
        title: maybeItem.title,
        headRefName: maybeItem.headRefName,
        baseRefName: maybeItem.baseRefName,
        mergeStateStatus: maybeItem.mergeStateStatus,
        mergeable: maybeItem.mergeable,
        isDraft: maybeItem.isDraft,
        updatedAt: maybeItem.updatedAt,
        url: maybeItem.url,
      };
    })
    .filter((pr): pr is PrStatus => pr !== null);
};

export const fetchMyOpenPrs = ({ repo }: { repo?: string } = {}): PrStatus[] => {
  const repoFlag = repo ? ` --repo ${repo}` : '';
  const output = execSync(
    `gh pr list --author "@me" --state open --json number,title,headRefName,baseRefName,mergeStateStatus,mergeable,isDraft,updatedAt,url${repoFlag}`,
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  return parsePrListJson({ output });
};

export const fetchDefaultBranch = (): string => {
  const output = execSync(
    'gh repo view --json defaultBranchRef --jq .defaultBranchRef.name',
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  return output.trim();
};

export interface RepoInfo {
  name: string;
  nameWithOwner: string;
  url: string;
}

/**
 * Get current repository info (name, owner/name, url).
 */
export const fetchRepoInfo = ({ repo }: { repo?: string } = {}): RepoInfo => {
  const repoArg = repo ? ` ${repo}` : '';
  const output = execSync(
    `gh repo view${repoArg} --json name,nameWithOwner,url`,
    {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    },
  );

  const parsed: unknown = JSON.parse(output);
  const info = parsed as Partial<RepoInfo>;

  if (!info.name || !info.nameWithOwner || !info.url) {
    throw new Error('Failed to fetch repository info');
  }

  return {
    name: info.name,
    nameWithOwner: info.nameWithOwner,
    url: info.url,
  };
};
