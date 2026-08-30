# Roadmap

> **This is the primary high-level plan for the project.**
> Check this file before proposing new work. Add new items when conceiving features.
> Keep it ordered by priority — move completed items to the Done section at the bottom.

---

## How to use this file

| Tier | Meaning                                   |
| ---- | ----------------------------------------- |
| P0   | Active — being worked on now              |
| P1   | Next — fully scoped, ready to start       |
| P2   | Planned — direction decided, detail TBD   |
| P3   | Backlog — good ideas, not yet prioritised |

When an item is done, move it to the Done section at the bottom with a completion date.

---

## Next

- [ ] Review and update this list for the project.

## P0 — Active

_Nothing active right now — pick from P1._

---

## P1 — Next Up

_No items yet._

---

## P2 — Planned

_No items yet._

---

## P3 — Backlog

### Adopt shared live-dashboard primitives

`genx` is building `genx managed live`, a refreshing multi-repo table for package alignment — the
same mechanical shape as `gli live`, a different domain. If the two converge, the shared parts
(remembered multi-select, tiered refresh, git ahead/behind) move into `@finografic/cli-kit` and gli
adopts them.

Blocked twice over: on genx shipping, then on cli-kit extracting. gli is the reference
implementation here, not the follower — if the extracted API cannot express what `gli live` already
does, the API is wrong and genx keeps its own copy.

Detail: [`docs/todo/TODO_ADOPT_LIVE_PRIMITIVES.md`](./TODO_ADOPT_LIVE_PRIMITIVES.md)

---

## Done

| Item                           | Completed |
| ------------------------------ | --------- |
| _No completed milestones yet._ | —         |
