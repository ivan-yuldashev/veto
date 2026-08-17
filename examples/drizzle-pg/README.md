# drizzle-pg — proving the SQL matches

One policy, two ways to enforce it: walking loaded rows with `can()`, and letting the database filter with `@vetojs/drizzle`. This script runs both for every actor and asserts the visible row sets are **identical** — exiting non-zero if they ever aren't.

```sh
pnpm --filter @vetojs-examples/drizzle-pg start
```

Runs against an in-memory [PGlite](https://pglite.dev) — real Postgres semantics, nothing to install. To point it at a real server:

```sh
DATABASE_URL=postgres://user:pass@localhost:5432/db pnpm --filter @vetojs-examples/drizzle-pg start
```

Only the driver line differs; the tables, the policy and the filter are the same.

## Output

A row per actor and action, both paths side by side (abbreviated here):

```
│ actor   │ action   │ can() rows                                   │ SQL rows                                     │ match │
│ 'alice' │ 'read'   │ 'alice-draft, launch, wip-notes'             │ 'alice-draft, launch, wip-notes'             │ '✓'   │
│ 'bob'   │ 'update' │ 'wip-notes'                                  │ 'wip-notes'                                  │ '✓'   │
│ 'carol' │ 'read'   │ 'launch, old-announce, old-draft, wip-notes' │ 'launch, old-announce, old-draft, wip-notes' │ '✓'   │

All sets match — can() and SQL agree on every row. ✓
```

## What it covers

The domain is multi-tenant — `workspace → blog → post → comment` ([shared](../shared/src/model.ts)) — with a membership-driven policy ([policy.ts](../shared/src/policy.ts)): viewers read published posts in their workspace, editors also read drafts and update their own, admins manage everything.

On top of that, each of these appears in both paths and must agree:

- **An ordering condition** — `views: { gte: 100 }` makes a trending post readable even as a draft, so carol (a mere viewer) sees `wip-notes`. In SQL: `coalesce(views >= 100, false)`.
- **Conditions across relations** — `post.blog.workspace.id` becomes a correlated `EXISTS`.
- **A quantifier as a deny** — "you can't edit a post that still has spam" (`comments: { some: { spam: true } }`) becomes `NOT EXISTS`. `launch` has one, so nobody can update it — not even admin alice.
- **A deny through a nested relation** — "nothing changes in an archived workspace". Carol edits in Legacy, so she reads its drafts but updates nothing, on both paths.

Two more things are demonstrated after the table, since they have no SQL counterpart:

- **The payload gate** — bob may write his own draft's `title` freely, and `status`, but only to `"draft"`. A crafted `"published"` is rejected as *value not permitted*.
- **Fail-closed behaviour** — `can()` on a row whose relation was never loaded throws instead of guessing; `markLoaded(row, "blog", null)` turns that into a real answer; `authorize()` throws rather than returning `false`.
