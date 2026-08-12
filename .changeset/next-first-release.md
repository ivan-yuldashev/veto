---
"@vetojs/next": minor
---

First release. `createGuard` wraps a server action or route handler so the actor, the row and the payload are all checked before your handler runs.

```ts
export const withPermission = createGuard({ ac, getActor, policy: policyFor });

export const updatePost = withPermission(
	{
		action: "update",
		resource: "post",
		load: (formData) => loadPost(formData.get("id")),
		payload: (formData) => ({ title: String(formData.get("title")) }),
	},
	async (ctx, formData) => {
		await db.update(posts).set(ctx.payload).where(eq(posts.id, ctx.row.id));
	},
);
```

Arguments pass through untouched, so `useActionState` actions — which receive `(previousState, formData)` — and route handlers taking `(request, context)` need no adapter. `ctx.payload` is the validated copy, so a field the actor may not write cannot reach your database call by accident. A refusal throws `ForbiddenError`, or goes to `onDeny` / `onUnauthenticated` if you would rather answer with `notFound()`, `redirect()` or a 401.

The package imports neither `next` nor `react`; `@vetojs/core` is a peer dependency.
