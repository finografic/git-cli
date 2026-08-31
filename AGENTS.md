# AGENTS.md — AI Assistant Guide

## Project Memory Model

- `docs/todo/ROADMAP.md` = milestone plan, near-term tasks, and completed history.
- `.agents/handoff.md` = stable current project state.
- `.agents/memory.md` = chronological session log.

Promote durable findings from memory → handoff, priorities and follow-ups → roadmap.

Reference: [`docs/process/PROJECT_MEMORY_MODEL.md`](./docs/process/PROJECT_MEMORY_MODEL.md)

---

## Roadmap and Planning Docs

- Check `ROADMAP.md` before proposing new initiatives.
- Use `ROADMAP.md#next` for small follow-ups and manual validation.
- Keep detailed plans in `docs/todo/TODO_*.md`; graduate completed plans to `DONE_*.md`.
- Follow `.agents/instructions/documentation/todo-done-docs.instructions.md`.

---

## Rules — Project-Specific

Project-specific rules live in `.agents/instructions/project/**/*.instructions.md`.

<!-- NOTE: @finografic/gli - CLI package (`genx:type:cli` keyword in package.json) only -->

- This is a **standalone installable package** (`@finografic/gli`), not a monorepo workspace member.
- Published to GitHub Packages (`https://npm.pkg.github.com`).
- Do not reference `@workspace/*` — all imports and deps must use published package names.

## Rules — Global

Rules are canonical in `.agents/instructions/` — see `README.md` there for folder structure.
Shared across Claude Code, Cursor, and GitHub Copilot.

**General**

- General baseline: `.agents/instructions/general.instructions.md`

**Code**

- TypeScript patterns: `.agents/instructions/code/typescript-patterns.instructions.md`
- Modern TS patterns: `.agents/instructions/code/modern-typescript-patterns.instructions.md`
- Oxlint & style: `.agents/instructions/code/linting-code-style.instructions.md`
- Provider/context patterns: `.agents/instructions/code/provider-context-patterns.instructions.md`
- Picocolors CLI styling: `.agents/instructions/code/picocolors-cli-styling.instructions.md`

**Naming**

- File naming: `.agents/instructions/naming/file-naming.instructions.md`
- Variable naming: `.agents/instructions/naming/variable-naming.instructions.md`

**Documentation**

- Documentation: `.agents/instructions/documentation/documentation.instructions.md`
- README standards: `.agents/instructions/documentation/readme-standards.instructions.md`
- Agent-facing markdown: `.agents/instructions/documentation/agent-facing-markdown.instructions.md`
- Feature design specs: `.agents/instructions/documentation/feature-design-specs.instructions.md`
- TODO/DONE docs: `.agents/instructions/documentation/todo-done-docs.instructions.md`

**Git**

- Git policy: `.agents/instructions/git/git-policy.instructions.md`

---

## Rules — Markdown Tables

- Padded pipes: one space on each side of every `|`, including the separator row.
- **Do NOT manually align column widths or pad cells to equal width.** `oxfmt` (run automatically
  by lint-staged on commit and by `pnpm format:fix`) fixes table alignment automatically. Spending
  tokens counting characters and iterating on spacing is wasted effort — write the content, let the
  formatter handle alignment.

---

## Git Policy

- Do not include `Co-Authored-By` lines in commit messages.
- `.agents/instructions/git/git-policy.instructions.md` (see Commits and Releases sections)

---

## Cursor

- Always-on rules: `.cursor/rules/` (`alwaysApply` — entry point is `AGENTS.md`, same as `CLAUDE.md`)

---

## Agent execution efficiency

Prefer the smallest complete implementation and validation loop for the task. Aim for one orientation pass, one coherent edit pass, and one focused validation pass; further loops need a concrete failure or newly discovered dependency.

Avoid side quests: do not broaden into adjacent refactors, cleanup, environment repair, or unrelated warning fixes unless required to complete or validate the requested change.

### Before editing

- Orient on the owning module, its direct callers/callees, and affected tests — not adjacent subsystems.
- Read applicable repository instructions before implementing.
- Once owning surfaces are identified, start implementing.

### Scope

- Reuse established patterns before adding abstractions.
- Do not generalize one-use helpers unless reuse is immediate and obvious.
- Preserve unrelated uncommitted files and pre-existing warnings.

### Validation

Use progressive validation and stop once the change is proven:

1. Narrowest relevant test or test file
2. Typecheck for directly affected packages
3. Format/lint on touched files when supported
4. Broader repo checks only when shared exports change, focused checks cannot prove correctness, a failure requires them, or the user asks

### Tool use and failures

- Batch related reads/searches and coherent edits; avoid repeating the same command through different wrappers.
- Progress updates at phase boundaries only (orientation / implementation / validation).
- Distinguish failures caused by this change from pre-existing ones; fix unrelated failures only when they block validation, and report them in the summary.

---

## Learned User Preferences

- Ignore .cursor/chats and .cursor/hooks; commit .cursor/mcp.json
- Prefer default `~/.config/finografic/gli.config.json` templates that list all keys (including optional blocks like `jira` with empty strings) so users can edit without inferring field names
- Prefer documentation and CLI examples that match shipped behavior (for example `gli rebase` has no `--dry-run` or `--stay`)
- Prefer per-command `*.help.ts` modules to import only types from `@finografic/cli-kit/render-help` and use literals (or comments pointing at constants) for default values in help text rather than importing app config modules

## Learned Workspace Facts

- The npm package is `@finografic/gli`; the repo and package were renamed from `git-cli` / `@finografic/git-cli`.
- The CLI entry is `src/cli.ts`, built to `dist/cli.mjs`; `main`, `types`, `exports["."]`, and `bin.gli` all target that bundle.
- TypeScript `paths` in `tsconfig` are resolved when bundling with tsdown; Vitest (or other runners) needs matching alias resolution if tests import via those aliases.
- Jira issue links in PR output are off when `jira.baseUrl` is missing, empty, or whitespace-only after trim; legacy top-level `jiraBaseUrl` in config is not read.
- Per-command `--help` text lives in `src/commands/<name>/<name>.help.ts` as `CommandHelpConfig`; root `gli --help` overview stays in `src/cli.help.ts`
- `gli config` subcommands are `watch`, `list`, `remove`, and `edit` (there is no `path` or `add` subcommand)
- PR list display settings in user config use the `prs` key (`prs.title.*`); `readConfig` still maps legacy `prListing` into `prs` when `prs` is absent
