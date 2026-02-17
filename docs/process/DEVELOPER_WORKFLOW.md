# Developer Workflow

Simple workflow for maintaining this config-only package.

---

## Daily Development

### Code Quality

```bash
pnpm lint          # Check code style
pnpm lint.fix      # Auto-fix issues
pnpm format        # Format files with dprint
pnpm format.check  # Check formatting without modifying
```

### Updating Plugin Versions

To update all dprint plugin versions to their latest compatible versions:

```bash
pnpm dprint.plugins.update
```

This runs `dprint config update` on each per-plugin config file (`dprint-*.jsonc`).

---

## Git Workflow

### Pre-commit Hook

When you commit, a pre-commit hook automatically:

1. Runs `lint-staged` on staged files
2. Lints and fixes TypeScript/JavaScript files (`*.ts`, `*.tsx`, `*.mjs`)
3. Lints and fixes Markdown files (`*.md`)
4. Blocks commit if lint errors remain

**To bypass** (not recommended):

```bash
git commit --no-verify -m "message"
```

---

## Release Workflow

See [Release Process](./RELEASES.md) for complete release instructions.

**Quick summary:**

```bash
pnpm release.github.patch  # or .minor or .major
```

This automatically:

1. Runs `lint.fix` on the entire codebase
2. Bumps version in `package.json`
3. Creates a git commit and tag
4. Pushes to GitHub (triggers GitHub Actions release)

---

## Related Documentation

- [Release Process](./RELEASES.md) - Complete release workflow
- [GitHub Packages Setup](./GITHUB_PACKAGES_SETUP.md) - Initial configuration
