# @vetojs/core

## 0.3.0

### Minor Changes

- 23e9272: **Fixed: a `deny` on an object-valued field no longer fails open.**

  Equality fell through to `===` for two objects, and structurally identical objects are never the same reference. The engine read that as a _decidable_ non-match, so a prohibition like this applied to nothing:

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
  import {
    isPayloadScoped,
    isPlainObject,
    ruleMatches,
  } from "@vetojs/core/internal";
  ```

  These let an adapter or a guard inspect a policy without evaluating it; an application calls none of them. Keeping them on the main entry promised semver stability to callers who will never appear, and hid the one adapters actually need — the predicate deciding whether a `deny` speaks about data or about rows.

  **Breaking:** `ruleMatches` is no longer exported from `@vetojs/core`. Import it from the subpath instead. Nothing else moved. The subpath carries no stability promise across minor versions — that is what the name is for.

## 0.2.0

### Minor Changes

- 6e5c998: Fix: a `deny` that names payload fields or constraints no longer blocks the row.

  `deny(action, resource, { payload: { fields: [...] } })` reads as "this field may not be written". `permittedFields` and `validatePayload` already treated it that way, but `evaluateRules` and `compileWhere` ignored `payload` entirely — and a `deny` with no `where` matches every row. The rule therefore vetoed the action outright: `can` and `canMutate` returned `false` for every row, `where()` compiled to a filter matching nothing, and the documented `canMutate` → `validatePayload` order never reached the field check.

  All four now share one predicate. A `deny` is payload-scoped when it names `payload.fields` or `payload.constraints`; such a rule settles in `validatePayload` and leaves the row decision alone, and a `where` on it scopes which rows the field restriction covers. A `deny` naming neither — including one carrying an empty `payload: {}` — remains a prohibition on the action itself, unchanged.

  The conformance suite gained payload-carrying cases; it had none, which is why the `can()` / `where()` divergence went unnoticed.

  The old behaviour only ever denied more than intended, so no policy becomes more permissive than its author wrote.

- f303ea8: Fix: `validatePayload` no longer passes empty data on a row no `allow` covers.

  `validatePayload` only ever objected to keys it found in `data`, so `{}` gave it nothing to object to and it answered `{ ok: true }` — even for a row the actor may not write at all. `permittedFields` already returned `[]` in that situation; the two disagreed.

  It now refuses outright when no `allow` applies to the row, matching `permittedFields` and `canMutate`. Non-empty data was already refused, so only the empty-payload path changes.

  Callers following the documented `canMutate` → `validatePayload` order were never exposed, since the row gate ran first. The risk was in treating `validatePayload` as the whole check — which its signature invites, because it takes the row.

## 0.1.0

### Minor Changes

- 355ca26: First public release.

  `@vetojs/core` — the engine: `defineAbilities`, `createRules`, `buildAbility`, `parseRules`, ten condition operators, relations with a loaded-relation contract, the write gate (`canMutate` / `validatePayload` / `permittedFields`), and `where()` for compiling a policy into a database filter. Zero runtime dependencies.

  `@vetojs/react` — `createVetoContext(ac)` returning `<Can>`, `useAbility` and `AbilityProvider`, typed per resource.
