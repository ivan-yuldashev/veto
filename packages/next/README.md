# @vetojs/next

Next.js guards built on the [`@vetojs`](https://github.com/ivan-yuldashev/vetojs#readme) engine — **[English](README.md) · [Русский](README.ru.md)**.

A server action in Next.js is a public endpoint. However well hidden it is in your interface, anyone can call that action and pass absolutely any arguments.

Because of that, developers end up duplicating the same routine in every action: work out the user first, then load the resource from the database, check the permissions, and only after all that run the actual business logic. `@vetojs/next` takes that work off your hands, letting you write the whole checking infrastructure exactly once.

```sh
npm install @vetojs/next @vetojs/core
```

The library ships as ESM only and requires Node.js 20 or newer.

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

What happens under the hood? Before your handler starts, the guard has already worked out the user, assembled the policy, loaded the row and validated the incoming data. If even one of those checks fails, your business logic is never reached.

Your handler receives the prepared context (`ctx`) as its first argument, and then all the original arguments unchanged:

| `ctx` property | Description |
| --- | --- |
| `actor` | The current user (whatever `getActor` returned). |
| `ability` | The assembled ability object (in case you need extra manual checks inside). |
| `row` | The loaded resource (the result of calling `load`). |
| `payload` | The **strictly validated** data — write this to the database, not the user's raw input. |

Because every original argument is passed straight through untouched, you need no extra adapters for actions under `useActionState` (which receive `(previousState, formData)`) or for route handlers with their `(request, context)` — it all works exactly the same way.

## Checks that match your intent

Depending on what you declared in the configuration, the guard adjusts the strictness of its checks automatically:

| What you declared | What gets checked |
| --- | --- |
| `load` + `payload` | Whether writing to this specific row is allowed **and** whether the given fields and values are permitted. |
| `load` only | Whether this action on this row is allowed at all. |
| `payload` only | Whether writing is allowed in general **and** whether these fields and values are permitted. |
| Nothing | Whether the user may perform this action in principle. |

**Important:** if `load` didn't return a row (the record wasn't found, say), the call is rejected. The guard will never quietly "slide" down to the weaker check that ignores the row.

## Handling denials

When a check doesn't pass, a `ForbiddenError` is thrown. Inside it are the `action` and `resource` fields, plus the exact list of violations (`violations`) if the refusal happened while validating data.

- Catch the error strictly through the `ForbiddenError.is(error)` method.
- **Don't use `instanceof`** — it returns `false` if two different copies of `@vetojs/core` happen to end up in your dependency tree.

For convenience, denials can be handled centrally, right where the guard is created:

```ts
createGuard({
	ac,
	getActor,
	policy: policyFor,
	onDeny: () => notFound(),
	onUnauthenticated: () => redirect("/login"),
});
```

Note that neither hook may return control to the caller. `notFound()`, `redirect()` and a plain `throw` all satisfy that rule nicely. If a hook does return control, the guard throws on its own — a hook is there to report the denial or redirect the user, but it cannot cancel that denial.

## What's next?

- **[Full guide](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/next.md)** — a detailed walk through every option, working with `useActionState`, route handlers, and an explanation of why lists are always filtered at the database level.
- **[About the project](https://github.com/ivan-yuldashev/vetojs#readme)** — more on what `@vetojs` is and how the authorization engine itself is built.

## License

MIT
