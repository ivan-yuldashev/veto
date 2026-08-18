# `@vetojs/next` — guarding server actions and routes

**[English](next.md) · [Русский](next.ru.md)**

A server action is a public endpoint. Whatever the UI shows, anyone can call it with any arguments — so every one needs the same three steps: work out who's asking, load what they're acting on, check, then run. This package writes those steps once.

```sh
npm install @vetojs/next @vetojs/core
```

`@vetojs/core` is a peer dependency, so your app resolves it once and the guard shares that copy. The package imports neither `next` nor `react` — it is a wrapper around your own functions.

## Configure once

```ts
// lib/permissions.ts
import { createGuard } from "@vetojs/next";
import { ac, policyFor } from "./abilities";
import { getActor } from "./auth";

export const withPermission = createGuard({ ac, getActor, policy: policyFor });
```

| Option | Meaning |
|---|---|
| `ac` | your resource declarations |
| `getActor` | how to find the current user — cookies, session, headers; may be async |
| `policy` | the actor → rules function |
| `onDeny` | optional: what to do instead of throwing (see below) |
| `onUnauthenticated` | optional: what to do when nobody is signed in — answer 401 where the default reports 403 |

## Wrap an action

```ts
"use server";

export const updatePost = withPermission(
	{
		action: "update",
		resource: "post",
		load: (formData) => loadPost(formData.get("id")),
		payload: (formData) => ({ title: String(formData.get("title")) }),
	},
	async (ctx, formData) => {
		await db.update(posts).set(ctx.payload).where(eq(posts.id, ctx.row.id));
		revalidatePath("/posts");
	},
);
```

The actor is resolved, the policy built, the row loaded and checked, and the payload validated — all before your handler runs. If any of that fails, the handler is never reached.

Your handler receives a context first, then the original arguments untouched:

| `ctx` | |
|---|---|
| `actor` | whatever `getActor` returned |
| `ability` | the built ability, if you need further checks |
| `row` | what `load` returned |
| `payload` | the **validated** data — use this, not the raw input |

## What gets checked

It depends on what you declared, and the three combinations are deliberate:

| You provide | The guard checks |
|---|---|
| `load` + `payload` | may this actor write this row, **and** are these fields and values permitted |
| `load` only | may this actor perform the action on this row |
| `payload` only | is the write permitted at all — and are these fields and values allowed |
| neither | may this actor perform the action at all |

Use `payload` for anything that writes. `ctx.payload` then holds the validated result, so a field the actor may not write cannot reach your database call even by accident.

The `payload`-only row is for creates, where there is no existing row to load. Row conditions can't be evaluated against something that doesn't exist yet, so the guard falls back to what it *can* decide: a `deny` that restricts rows refuses the write rather than waving it through, because without the row there is no way to tell whether it applies. A `deny` that only names payload fields or constraints says nothing about rows, so it does not refuse here — the payload check settles it, field by field. And because that check answers *what may this actor write*, a write no `allow` covers is refused too: an empty policy denies a create rather than waving it through.

## Denial

By default a failed check throws `ForbiddenError`, which carries `action`, `resource` and — for payload failures — the exact `violations`:

```ts
try {
	return await updatePost(formData);
} catch (error) {
	if (ForbiddenError.is(error)) {
		return { error: error.violations?.map((v) => `${v.field}: ${v.reason}`) };
	}
	throw error;
}
```

Or handle it centrally in the guard:

```ts
createGuard({
	ac,
	getActor,
	policy: policyFor,
	onDeny: () => notFound(),   // or redirect("/login")
});
```

`onDeny` must not return — `notFound()`, `redirect()` and `throw` all satisfy that, which keeps control flow linear for everything downstream. If one does return, the guard throws `ForbiddenError` anyway: the hook reports a denial, it never overturns one. `onUnauthenticated` works the same way.

## Works with `useActionState`

The wrapper passes arguments through unchanged, whatever their shape — so an action consumed by `useActionState`, which receives `(previousState, formData)`, needs no adapter:

```ts
export const updatePost = withPermission(
	{
		action: "update",
		resource: "post",
		load: (_state, formData) => loadPost(formData.get("id")),
		payload: (_state, formData) => ({ title: String(formData.get("title")) }),
	},
	async (ctx, _state, formData) => { /* … */ },
);
```

Route handlers work the same way with `(request, context)`.

## Fetching lists

The guard is for actions on things. A list is a query — filter it in the database instead, with the same policy:

```tsx
const ability = await getAbility();

const rows = await db.select().from(posts)
	.where(schema.filter(ability, "read", "post"));
```

See [filtering in the database](./where.md). A Drizzle adapter that turns that condition into SQL is in progress.

## Why it works this way

- **Configured once, applied per action.** The actor and policy resolution live in one place; each action only says what it acts on.
- **Arguments pass through untouched.** Server actions, `useActionState` and route handlers all have different signatures, and one wrapper covers them because it never inspects the arguments itself — your `load` and `payload` functions do.
- **The ability is built per request**, from the actor. It's a handful of closures over plain data, not something to cache or share between users.
- **`ctx.payload` is the validated data.** Handing back the raw input would make it too easy to write the thing that was just rejected.

## Source

[`guard.ts`](../packages/next/src/guard.ts) · [`types.ts`](../packages/next/src/types.ts) · [tests](../packages/next/tests/guard.test.ts)
