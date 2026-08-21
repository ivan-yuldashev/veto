# @vetojs/core

[![Socket](https://socket.dev/api/badge/npm/package/@vetojs/core)](https://socket.dev/npm/package/@vetojs/core)
[![Snyk](https://snyk.io/test/npm/@vetojs/core/badge.svg)](https://snyk.io/test/npm/@vetojs/core)

The engine of [`@vetojs`](https://github.com/ivan-yuldashev/vetojs#readme) — **[English](README.md) · [Русский](README.ru.md)**.

**Type-safe authorization with no classes, no magic, and no hidden state.**

`@vetojs/core` rests on one simple idea: an access policy should be a pure function. You hand it a user (or any other context), and it hands back an array of rules as plain JSON. Those rules are universal — they work on the server and on the client alike, they give you strict typing, and they translate elegantly into a `WHERE` clause for your database.

- **Rules are flat data.** Easy to serialize, to send to the client over the network, or to store safely in a database.
- **No hidden state.** Forget unpredictable class instances and state shared between requests.
- **Zero dependencies.** The library drags no extra code along with it, and uses no classes at all bar two error types.

```sh
npm install @vetojs/core
```

The library ships as ESM only and requires Node.js 20+.

## Quick start

```ts
import { defineAbilities, shape, createRules, buildAbility } from "@vetojs/core";

// 1. Declare your resource schema once.
const ac = defineAbilities({
	resources: {
		post: {
			schema: shape<{ id: string; authorId: string; status: "draft" | "published" }>(),
			actions: ["read", "update", "publish"],
			relations: { author: { resource: "user", kind: "one" } },
		},
		user: { schema: shape<{ id: string; role: string }>(), actions: ["read"] },
	},
});

// 2. A policy is a function that returns an array of rules.
const { allow, deny } = createRules(ac);

const policyFor = (user: { id: string }) => [
	allow("read", "post", { where: { status: "published" } }),
	allow(["update", "publish"], "post", { where: { authorId: user.id } }),
];

// 3. Hand the rules to the engine — and check access.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);  // ✓ typed against your schema
ability.can("delete", "post");        // ✗ compile error — "post" has no "delete"
```

## What's under the hood?

We designed the API to be intuitive.

- [`defineAbilities`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/define-abilities.md): the single source of truth for your resource schema, and where every type is inferred from (shapes, actions, relations).
- `shape<T>()`: a helper for declaring a resource shape. For runtime validation, pass any schema compatible with [Standard Schema](https://standardschema.dev) here instead (Zod, Valibot or ArkType, for example).
- [`createRules(ac)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/create-rules.md): a generator for strictly typed `allow` and `deny` functions — your actions, resources and `where` are checked against the schema automatically.
- [`buildAbility(ac, rules)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/ability.md): turns an array of flat rules into a ready-to-use `ability` object.
- [`parseRules(json, ac)`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/parse.md): safely validates rule JSON that arrived over the network or from a database.
- [`markLoaded`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/relations.md): marks a relation as loaded (handy for data you assembled by hand rather than through an ORM).
- `ConditionOperator`: the comparison operators available (`eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`, `has`, `hasAny`, `hasAll`).
- `ForbiddenError`, `RelationNotLoadedError`: the only two classes in the library.

The package has a second entry point, [`@vetojs/core/guard`](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/guard.md). `createGuard` configures the actor and the policy once, and the wrapper it returns resolves the actor, loads the row, validates the payload and only then runs your handler — the same wrapper for a server action, an [HTTP handler](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/http.md) and an [agent's tool call](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/agents.md).

```ts
import { createGuard } from "@vetojs/core/guard";

export const withPermission = createGuard({
	ac: accessControl,
	getActor: currentActor,
	policy: policyFor,
});
```

What `ability` gives you:

- **Permission checks:** `can`, `cannot` and `authorize` answer whether an action is allowed in general or for a specific row.
- **Mutations:** `canMutate` and `validatePayload` decide [whether data may be written](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/mutations.md) — and which fields and values in particular.
- **Interface:** `permittedFields` tells you which fields to leave editable for the user in a form.
- **Database:** `where` produces a ready [condition for a database query](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/where.md).
- **Validation and export:** `validate` checks incoming data against the schema, and `rules` returns the underlying flat array of rules, ready to be sent to the client.

## Predictable behaviour on bad data

Real databases hold `NULL`s, and the client may well send text where a number was expected. In situations like these, where no condition can be answered honestly, `@vetojs` doesn't guess — it returns the status **"unknown"**.

That is safe in both directions: an `allow` rule simply grants nothing, while a `deny` fires reliably anyway. Bad data can only ever narrow access, never widen it ([more about operators](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/operators.md)).

### Strictness when working with relations

With relations the engine is stricter still. If a rule inspects the `post.author.role` field, the author has to be loaded together with the post. If you forgot to load it, `can()` will not quietly answer "doesn't match" — it **throws**. A forgotten `include` in your ORM is a bug in the query, not a reason to silently change a user's permissions.

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
ability.can("update", "post", post);
```

The engine follows the same conventions your ORM does: `undefined` means the data was not loaded, and `null` means it was loaded and there is nothing there. If you assembled the data by hand, just say so explicitly with `markLoaded` ([more about relations](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/relations.md)).

## What's next?

- **[Documentation](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/README.md)** — detailed pages on every concept: from declaring resources to SQL filtering.
- **[For agents](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/for-agents.md)** — the whole API on one page, so it's easy to feed to an assistant.
- **Examples** — three runnable demos over one multi-tenant domain: [react-spa](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/react-spa), [next-app](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/next-app) and [drizzle-pg](https://github.com/ivan-yuldashev/vetojs/tree/main/examples/drizzle-pg), where `can()` and the compiled `WHERE` are compared row by row.

## License

MIT
