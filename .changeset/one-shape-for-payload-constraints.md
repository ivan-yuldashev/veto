---
"@vetojs/core": minor
---

**The one-shape rule now covers `payload.constraints` too.** 0.6.0 taught `parseRules` to reject a condition node naming more than one shape, but a rule's payload constraints go through a second, narrower walker that had no such gate.

```ts
payload: {
	fields: ["status"],
	constraints: {
		and: [{ field: "views", op: "lt", value: 1000 }],
		field: "status",
		op: "eq",
		value: "draft",
	},
}
```

The mutation gate reads `and` first, so the field constraint beside it was silently dropped: `validatePayload` accepted `status: "published"` under a rule that permits only `"draft"`. As with the condition-node case this needed no cast — stored JSON reached it through the ordinary path, and rules built with `createRules` were never affected.

`parseRules` now returns `ok: false` naming both shapes, and the fix is to nest the field constraint inside the group.
