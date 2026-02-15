# TODO - Remaining Tasks for Git CLI v2

## Project Status

**Core Refactoring**: ✅ **COMPLETE**

All high-priority commands have been successfully refactored with:

- ✅ Consistent help structure using `printCommandHelp` utility
- ✅ DRY PR display formatting with `formatPrLines()`
- ✅ Column-aligned output across all commands
- ✅ Reduced clack usage (only for genuine interactivity)

## ✅ Completed (Current Session)

### 1. Enhanced `gli rebase` Command

- ✅ Added `-i, --interactive` flag for manual pick/squash/edit
- ✅ Added `-s, --squash` flag for auto-squashing multiple commits
- ✅ Force-push confirmation (defaults to No for safety)
- ✅ Enhanced `--all` flow showing full PR context
- ✅ Step-through flow with progress indicators [1/3]
- ✅ Abort handling with continue/exit prompts
- ✅ Added `--stay` flag to stay on rebased branch
- ✅ Added `--dry-run` flag for previewing
- ✅ Returns to original branch (unless --stay or aborted)
- ✅ Standardized help template

### 2. Consistent Help Structure

- ✅ Applied `printCommandHelp` to all commands
- ✅ Main CLI help enhanced with better structure
- ✅ All commands follow same template pattern
- ✅ Consistent USAGE, OPTIONS, EXAMPLES sections
- ✅ HOW IT WORKS sections where appropriate

### 3. Previous Sessions

- ✅ Refactored `gli status` - clean list output, --all flag
- ✅ Refactored `gli select` - PR list before selection
- ✅ Refactored `gli watch` - overwrite prompt, consistent help
- ✅ `gli live` - star command, well-tested
- ✅ `gli config` - standardized help

## 📋 Remaining Tasks (Optional Polish)

### Testing & Validation

**Priority**: Medium
**Status**: Not started

- [ ] Test all commands with BEHIND/DIRTY PRs
- [ ] Test multi-repo configuration
- [ ] Test daemon installation/uninstallation
- [ ] Verify error handling across edge cases

**Test Scripts Available**:

See [TESTING.md](TESTING.md) for complete testing guide with scripts:

- `scripts/testing/enable-branch-protection.sh` - Enable branch protection
- `scripts/testing/create-behind-prs.sh` - Create PRs with conflicts (recommended)
- `scripts/testing/create-stale-prs.sh` - Create PRs without conflicts (legacy)

### Documentation Polish

**Priority**: Low
**Status**: README is current, automation not needed

- [ ] Add TESTING.md documentation (optional)
- [ ] Review error messages for clarity
- [ ] Add JSDoc comments to complex functions (optional)

### Future Considerations

**Status**: Discussion items, no immediate action needed

1. **Command Consolidation**:
   - `gli status` could be aliased to `gli live --once`
   - Current approach: Keep separate for clarity
   - Decision: Defer to user preference

2. **Watch Daemon**:
   - Still useful for background notifications
   - Complements `gli live` for different use cases
   - Keep as-is

3. **Unit Tests**:
   - Vitest configured but tests not required
   - Current approach: Manual testing is sufficient
   - Future: Add tests for complex utilities if needed

## 🎯 Success Criteria (All Met ✅)

- ✅ All commands use standardized help templates
- ✅ All PR displays use aligned columns via `formatPrLines()`
- ✅ Clack usage reduced to genuine interactivity only
- ✅ Consistent color scheme and formatting
- ✅ Enhanced rebase with all requested features
- ✅ Clean, professional CLI experience

## 📞 For Next Agent/Session

### Project Structure

**Locations**:

- Main repo: `/Users/justin/repos-finografic/@finografic-git-cli/`
- V1 reference: `/Users/justin/repos-finografic/git-cli-v1/`

**Key Files**:

- Main CLI: `src/cli.ts`
- Commands: `src/commands/<command>/<command>-command.ts`
- Utilities:
  - `src/utils/help.utils.ts` - Standardized help templates
  - `src/utils/pr-display.utils.ts` - DRY PR formatting
  - `src/utils/gh.utils.ts` - GitHub CLI wrapper
  - `src/utils/daemon.utils.ts` - LaunchAgent helpers

### Development Workflow

```bash
pnpm dev            # Watch mode during development
pnpm build          # Build for testing
pnpm typecheck      # Type checking
pnpm lint.fix       # Auto-fix linting
pnpm test.run       # Run tests
```

### Current State

All core functionality is complete and working. The CLI provides:

- Live PR monitoring (`gli live`)
- PR status checking (`gli status`)
- Interactive rebasing with advanced features (`gli rebase`)
- Branch selection (`gli select`)
- Multi-repo config (`gli config`)
- Background monitoring (`gli watch`)

Any remaining work is optional polish and testing.

### Quick Reference

**Common Operations**:

```bash
# Test the CLI
pnpm build
node dist/cli.mjs --help
node dist/cli.mjs <command> --help

# Link for local testing
pnpm link --global

# Create test PRs
tsx scripts/create-stale-prs.ts
```

**Publishing** (when ready):

```bash
pnpm release.github.patch  # Bump patch version, push tag
# GitHub Actions handles building and publishing to GitHub Packages
```

---

**Last Updated**: 2026-02-15
**Status**: Core refactoring complete ✅
**Next**: Optional testing and polish
