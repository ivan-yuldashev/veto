---
"@vetojs/core": minor
---

**Fixed: a `deny` on an object-valued field no longer fails open.**

Equality fell through to `===` for two objects, and structurally identical objects are never the same reference. The engine read that as a *decidable* non-match, so a prohibition like this applied to nothing:

```ts
deny("read", "doc", { where: { meta: { eq: { classified: true } } } });
// row { meta: { classified: true } } → can() === true
```

An `allow` written that way merely granted nothing, which is harmless. A `deny` was dead for every row, whatever it held.

`eq` / `ne` / `in` / `nin` now answer **unknown** whenever either operand is an object or an array — the same verdict a present value of the wrong type already gets, and the one that fails closed in both directions: an `allow` grants nothing, a `deny` fires. The comparison is undecidable rather than merely awkward, so this holds even when both sides are the very same reference; that case cannot survive `JSON.stringify` → `parseRules`, the documented path rules travel, so nothing that worked across the wire changes.

Scalars, `Date` (still compared by timestamp, including against epoch milliseconds) and the `number` / `bigint` bridge are untouched. Database adapters already refuse to compile an object comparison, so the engine and your SQL stay in agreement: one denies, the other declines to build the query.

If you need to match inside a nested object, model it as a relation — the engine compares scalars.

**Changed: adapter-facing exports moved to `@vetojs/core/internal`.**

```ts
import { isPayloadScoped, isPlainObject, ruleMatches } from "@vetojs/core/internal";
```

These let an adapter or a guard inspect a policy without evaluating it; an application calls none of them. Keeping them on the main entry promised semver stability to callers who will never appear, and hid the one adapters actually need — the predicate deciding whether a `deny` speaks about data or about rows.

**Breaking:** `ruleMatches` is no longer exported from `@vetojs/core`. Import it from the subpath instead. Nothing else moved. The subpath carries no stability promise across minor versions — that is what the name is for.
