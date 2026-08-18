---
"@vetojs/core": minor
---

**`ctx.row` and `ctx.payload` are optional only when the action left them out.**

Give the action a `load` and the handler gets a row, not a row-or-`undefined`:

```ts
const publish = withPermission(
	{ action: "publish", resource: "post", load: (id: string) => loadPost(id) },
	async (ctx) => ctx.row.title,
);
```

`ctx.payload` narrows the same way from `payload`. An action with neither keeps `undefined` in the type, because that is what the handler receives.
