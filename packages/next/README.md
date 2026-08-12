# @vetojs/next

Next.js guards for [`@vetojs`](https://github.com/ivan-yuldashev/veto#readme) — **[English](README.md) · [Русский](README.ru.md)**.

A server action is a public endpoint. Whatever the UI shows, anyone can call it with any arguments, so every one needs the same steps: work out who is asking, load what they are acting on, check, then run. This package writes those steps once.

```sh
npm add @vetojs/next @vetojs/core
```

ESM only, Node 20+.

## Configure once

```ts
// lib/permissions.ts
import { createGuard } from "@vetojs/next";
import { ac, policyFor } from "./abilities";
import { getActor } from "./auth";

export const withPermission = createGuard({ ac, getActor, policy: policyFor });
```

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
| `payload` | the **validated** data — write this, not the raw input |

Arguments pass through unchanged whatever their shape, so an action consumed by `useActionState` — which receives `(previousState, formData)` — needs no adapter, and route handlers work the same way with `(request, context)`.

## What gets checked

| You provide | The guard checks |
|---|---|
| `load` + `payload` | may this actor write this row, **and** are these fields and values permitted |
| `load` only | may this actor perform the action on this row |
| `payload` only | is the write permitted at all, and are these fields and values allowed |
| neither | may this actor perform the action at all |

A `load` that resolves to anything but a row refuses the call rather than quietly falling back to the weaker row-less check.

## Denial

A failed check throws `ForbiddenError`, carrying `action`, `resource` and — for payload failures — the exact `violations`. Recognise it with `ForbiddenError.is(error)` rather than `instanceof`, which answers `false` if two copies of `@vetojs/core` ever meet in one tree. Or handle it centrally:

```ts
createGuard({
	ac,
	getActor,
	policy: policyFor,
	onDeny: () => notFound(),
	onUnauthenticated: () => redirect("/login"),
});
```

Neither hook may return; `notFound()`, `redirect()` and `throw` all satisfy that. If one does return, the guard still throws — a hook reports a denial, it never overturns one.

## Documentation

- **[Full guide](https://github.com/ivan-yuldashev/veto/blob/main/docs/next.md)** — every option, `useActionState`, route handlers, and why lists belong in the database instead.
- **[Project README](https://github.com/ivan-yuldashev/veto#readme)** — what `@vetojs` is and how the engine works.

## License

MIT
