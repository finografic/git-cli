# TODO - Remaining Tasks for Git CLI v2

## Context from Initial Session

**Project Goal**: Refactor V2 by mixing best parts from V1, ensuring:

1. **Consistency** - Same help template across all commands
2. **DRY** - Common status display before most commands
3. **Reduce Clack** - Use simple colored lists instead of prompts where possible
4. **Column Alignment** - All tabular output should be aligned
5. **Command-by-Command** - Refactor each command systematically

**V2 Location**: `/Users/justin/repos-finografic/@finografic-git-cli/`
**V1 Location (Reference)**: `/Users/justin/repos-finografic/git-cli-v1/`

## 🚀 High Priority

### 1. Refactor `gli status` Command

**Status**: ✅ COMPLETED
**Goal**: Simplify to V1 style - remove clack prompts, use clean list output

**Tasks**:

- [x] Remove clack intro/outro
- [x] Use `formatPrLines()` from pr-display.utils.ts for aligned output
- [x] Apply standardized help template
- [x] Show simple PR list with colored status (like `gli live` but non-updating)
- [x] Remove interactive prompts - just display and exit
- [x] Support `--all` flag for multi-repo status
- [ ] Test with stale PRs

**Reference Files**:

- V1: `/Users/justin/repos-finografic/git-cli-v1/src/commands/status/status-command.ts`
- V2: `/Users/justin/repos-finografic/@finografic-git-cli/src/commands/status/status-command.ts`

### 2. Refactor `gli select` Command

**Status**: ✅ COMPLETED
**Goal**: Keep V2's good parts, ensure consistent help, reduce clack where possible

**Tasks**:

- [x] Apply standardized help template
- [x] Review clack usage - keep only where interactive selection is needed
- [x] Use `formatPrLines()` for PR list display before selection
- [x] Ensure column alignment
- [ ] Test functionality

**Reference Files**:

- V2: `/Users/justin/repos-finografic/@finografic-git-cli/src/commands/select/select-command.ts`

### 3. Refactor `gli watch` Command

**Status**: ✅ COMPLETED
**Goal**: Combine V1's excellent help + V2's functionality + ensure overwrite prompt

**Tasks**:

- [x] Apply V1's help template (with USAGE, SUBCOMMANDS, EXAMPLES, REQUIREMENTS, HOW IT WORKS)
- [x] Port V1's `watch install` overwrite prompt (missing in V2)
- [x] Review and update `watch status` to use clean output (not clack)
- [x] Ensure consistency with `gli live` for status displays
- [ ] Test daemon installation/uninstallation

**Reference Files**:

- V1: `/Users/justin/repos-finografic/git-cli-v1/src/commands/watch/watch-command.ts` (✅ WINNER for help)
- V2: `/Users/justin/repos-finografic/@finografic-git-cli/src/commands/watch/watch-command.ts`

**Note**: The `watch` command may become less critical now that `gli live` exists, but keep it for background notifications.

## 🤔 Medium Priority

### 4. Review `gli rebase` Command

**Status**: Deferred for separate discussion
**Goal**: Discuss with user about rebase command strategy

**Tasks**:

- [ ] Review V1's rebase implementation
- [ ] Review V2's rebase implementation
- [ ] Discuss with user: Keep? Modify? Remove?
- [ ] Decide on interactive rebase workflow

**Reference Files**:

- V1: `/Users/justin/repos-finografic/git-cli-v1/src/commands/rebase/rebase-command.ts`
- V2: `/Users/justin/repos-finografic/@finografic-git-cli/src/commands/rebase/rebase-command.ts`
- Screenshot: `EXAMPLES/gli-v1 -- 🤔 rebase-help (REBASE FLOW - good).png`

### 5. Main CLI Help

**Status**: Partially done
**Goal**: Apply standardized help template to main `gli --help`

**Tasks**:

- [ ] Use `printCommandHelp()` for main help
- [ ] List commands with proper descriptions
- [ ] Show examples
- [ ] Highlight `gli live` as the star command

**Reference Files**:

- V2: `/Users/justin/repos-finografic/@finografic-git-cli/src/cli.ts`

### 6. Consider Command Consolidation

**Status**: Not started
**Goal**: Evaluate if `gli live` makes other commands redundant

**Possible Consolidations**:

- [ ] `gli status` → `gli live --once` (alias or merge?)
- [ ] Review if `watch` daemon is still needed with `gli live` available
- [ ] Document recommended workflow

## 📝 Polish & Documentation

### 7. Update README

**Status**: Manual updates done, automation deferred
**Note**: Future automation via `pnpm docs.usage` - Command READMEs (e.g., `src/commands/live/README.md`) would be auto-inserted into main README between `<!-- GENERATED:COMMANDS:START/END -->` markers

**Tasks**:

- [x] Ensure `gli live` is prominently featured
- [x] Update examples with new command syntax
- [ ] Create `pnpm docs.usage` script to automate command doc insertion (DEFERRED - manual is fine for now)
- [ ] Add per-command README.md files if needed (DEFERRED)
- [ ] Add testing section reference to TESTING.md

### 8. Help Templates for All Commands

**Status**: 3/5 commands done (config ✅, status ✅, select ✅)
**Goal**: Apply `printCommandHelp()` to all remaining commands

**Checklist**:

- [x] config (✅ Done)
- [x] status (✅ Done)
- [x] select (✅ Done)
- [x] watch (✅ Done)
- [ ] rebase
- [ ] live (already has custom help, but review for consistency)

### 9. Aesthetic Consistency

**Status**: Done for `gli live`, `gli status`, `gli select`

**Tasks**:

- [x] Apply column alignment to `status` command
- [x] Apply column alignment to `select` command
- [x] Ensure all commands use `formatPrLines()` for PR lists
- [ ] Consistent metadata display across commands

## 🔬 Testing & Validation

### 10. End-to-End Testing

**Status**: Not started

**Tasks**:

- [ ] Test all commands with the test PRs from `create-behind-prs.sh`
- [ ] Verify BEHIND status shows correctly
- [ ] Verify DIRTY status shows correctly
- [ ] Test multi-repo configuration
- [ ] Test daemon installation/uninstallation
- [ ] Test `gli live` with different intervals

### 11. Error Handling

**Status**: Basic error handling exists, needs review

**Tasks**:

- [ ] Review error messages across all commands
- [ ] Ensure helpful error messages when gh CLI not installed
- [ ] Ensure helpful messages when not in a git repo
- [ ] Handle edge cases (no PRs, no internet, etc.)

## 🛠️ Technical Improvements (Optional)

### 12. Add TypeScript Utility Types

**Status**: Not started
**Priority**: Low

**Tasks**:

- [ ] Review and add utility types as needed
- [ ] Ensure type safety across all commands
- [ ] Add JSDoc comments for better IDE support

### 13. Add Unit Tests

**Status**: Not started
**Priority**: Low

**Tasks**:

- [ ] Add vitest tests for utility functions
- [ ] Test PR display formatting
- [ ] Test column alignment logic
- [ ] Test status display functions

## 📋 Agent Continuation Instructions

**If continuing this work:**

1. **Start with High Priority tasks** in order (status, select, watch)
2. **Reference V1 implementations** at `/Users/justin/repos-finografic/git-cli-v1/`
3. **Use existing utilities**:
   - `src/utils/help.utils.ts` for help templates
   - `src/utils/pr-display.utils.ts` for PR formatting (DRY)
   - `src/utils/daemon.utils.ts` for daemon status
4. **Follow the patterns established in `gli live`**:
   - Column alignment with `formatPrLines()`
   - Consistent color scheme (white labels, cyan branches, colored status)
   - Minimal clack usage
5. **Test after each command** using `create-behind-prs.sh`
6. **Build after changes**: `pnpm build`
7. **Reference screenshots** in `EXAMPLES/` for UX decisions

## 🎯 Success Criteria

- [ ] All commands use standardized help templates
- [ ] All PR displays use aligned columns
- [ ] Clack prompts reduced to only where interactive input is needed
- [ ] All commands tested with BEHIND/DIRTY PRs
- [ ] Documentation updated
- [ ] Build passes with no errors

## 📞 Questions to Resolve

1. **Rebase command**: Keep, modify, or remove?
2. **Command consolidation**: Should `gli status` become `gli live --once`?
3. **Watch daemon**: Is it still needed with `gli live` available?
4. **Additional features**: Any other commands or features needed?

---

**Last Updated**: Session ending (2024-02-15)
**Session Credits**: Near limit, documented for continuation
