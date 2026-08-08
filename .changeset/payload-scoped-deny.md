---
"@vetojs/core": minor
---

Fix: a `deny` that names payload fields or constraints no longer blocks the row.

`deny(action, resource, { payload: { fields: [...] } })` reads as "this field may not be written". `permittedFields` and `validatePayload` already treated it that way, but `evaluateRules` and `compileWhere` ignored `payload` entirely — and a `deny` with no `where` matches every row. The rule therefore vetoed the action outright: `can` and `canMutate` returned `false` for every row, `where()` compiled to a filter matching nothing, and the documented `canMutate` → `validatePayload` order never reached the field check.

All four now share one predicate. A `deny` is payload-scoped when it names `payload.fields` or `payload.constraints`; such a rule settles in `validatePayload` and leaves the row decision alone, and a `where` on it scopes which rows the field restriction covers. A `deny` naming neither — including one carrying an empty `payload: {}` — remains a prohibition on the action itself, unchanged.

The conformance suite gained payload-carrying cases; it had none, which is why the `can()` / `where()` divergence went unnoticed.

The old behaviour only ever denied more than intended, so no policy becomes more permissive than its author wrote.
