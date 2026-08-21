---
"@vetojs/core": minor
---

**`schema` is optional now.**

A resource that has no rows behind it — a screen, a report, a background job — is declared without one:

```ts
const ac = defineAbilities({
	resources: {
		post: { schema: shape<Post>(), actions: ["read", "update"] },
		report: { actions: ["view", "export"] },
	},
});
```

It stays a resource in every other way: its own actions, ordinary rules, and `can("view", "report")` answering from them. What changes is the shape, which is empty — so a row cannot be passed by mistake and no condition can compare a field the resource never had. `ability.validate` still accepts any object and refuses anything else, and a resource nobody declared is still refused as unknown.

Declaring `schema: shape<Record<string, never>>()` to say the same thing is no longer needed.
