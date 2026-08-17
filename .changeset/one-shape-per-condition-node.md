---
"@vetojs/core": minor
---

**`parseRules` rejects a node that carries more than one shape.** Such a node used to pass the gate, and every reader then answered the first shape it recognised and silently discarded the rest.

```ts
where: {
	field: "views",
	op: "gt",
	value: 100,
	and: [{ field: "id", op: "eq", value: "p1" }],
}
```

The engine looks for `and` first, so `views > 100` was never evaluated. In an `allow` that grants more than the rule says: a row with `views: 5` passed.

A rule's `payload.constraints` had the same hole. The mutation gate collects the `and` group and drops the field constraint beside it, so `validatePayload` accepted `status: "published"` under a rule permitting only `"draft"`.

Neither needed a cast — a policy loaded from a database or an admin UI reached both through the ordinary path. Rules built with `createRules` were never affected: sibling keys in the shorthand compile into a proper `and` group. If your stored JSON contains such a node, `parseRules` now returns `ok: false` naming both shapes, and the fix is to nest the field condition inside the group where it was meant to be.
