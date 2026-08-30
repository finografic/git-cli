# TODO — Adopt shared live-dashboard primitives (Phase 3)

> **Blocked** on `@finografic/cli-kit` shipping the primitives, which is itself blocked on
> `genx managed live` shipping first.
>
> Source of truth: [`@finografic/genx` → `docs/todo/TODO_MANAGED_LIVE_DASHBOARD.md`](https://github.com/finografic/genx).

`gli live` is the existing implementation of a refreshing multi-repo table. genx is building a
second one for package alignment. If the two converge on the same shape, the shared parts move into
the kit and gli adopts them.

---

## gli is the reference, not the follower

`gli live` shipped first and works. This is not a rewrite, and gli should not change to accommodate
a design that has not proven itself.

Concretely: if the extracted API cannot express what `gli live` already does — the auto-rebase
cadence, Jira issue prefixes, PR title truncation — the API is wrong and genx keeps its own copy.
gli's behaviour is the constraint, not the thing to bend.

---

## Domains stay separate

Worth restating, because the two commands will look alike:

|          | `gli live`                                 | `genx managed live`                      |
| -------- | ------------------------------------------ | ---------------------------------------- |
| Question | What is happening with my branches and PRs | Are my packages aligned with policy      |
| Config   | own `repos: []`                            | `~/.config/finografic/genx.config.jsonc` |
| Domain   | GitHub, Jira, rebase                       | deps-policy, features, toolchain         |

Only the mechanics are shared: a remembered multi-select, a tiered refresh loop, git ahead/behind
and dirty counts. Nothing domain-shaped moves.

---

## When unblocked

- [ ] Compare gli's refresh/caching against genx's tiered version — confirm one shape covers both
- [ ] Confirm the kit's multi-select can express gli's current selection behaviour, including
      `gli select`
- [ ] Replace only what the kit genuinely covers; keep anything gli-specific local
- [ ] Verify no behaviour change for existing users — this is a refactor, and a dashboard that
      refreshes differently after it is a regression, not an improvement

---

## Related

- Phase 2: [`@finografic/cli-kit` → `TODO_MANAGED_LIVE_PRIMITIVES.md`](https://github.com/finografic/cli-kit)
