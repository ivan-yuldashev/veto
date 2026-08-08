---
"@vetojs/core": minor
---

Fix: `validatePayload` no longer passes empty data on a row no `allow` covers.

`validatePayload` only ever objected to keys it found in `data`, so `{}` gave it nothing to object to and it answered `{ ok: true }` — even for a row the actor may not write at all. `permittedFields` already returned `[]` in that situation; the two disagreed.

It now refuses outright when no `allow` applies to the row, matching `permittedFields` and `canMutate`. Non-empty data was already refused, so only the empty-payload path changes.

Callers following the documented `canMutate` → `validatePayload` order were never exposed, since the row gate ran first. The risk was in treating `validatePayload` as the whole check — which its signature invites, because it takes the row.
