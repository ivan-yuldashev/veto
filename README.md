# @vetojs

**[English](README.md) · [Русский](README.ru.md)**

**Type-safe authorization with no classes, no magic, and no hidden state.**

A policy is a pure function. It takes a user (or any other context you need) and returns an array of rules as plain JSON. That array travels from server to client without ceremony. The same array is what checks permissions, with full type inference, and what turns elegantly into a safe `WHERE` clause for your database.

- **A perfect fit for React Server Components.** Rules are flat data you can hand to the client as-is.
- **Compiles to SQL automatically.** The policy behind `can()` translates into a `WHERE` clause. The database returns exactly the rows the user is allowed to see.
- **Safe on bad data.** A wrong-typed value or a missing field can narrow access, but will never widen it.
- **4.1 kB gzipped.** That buys you validation of the rules arriving from the server, building an ability, and checking a row. If the rules are already trusted, the size drops to 2.9 kB. A check inside a server component costs a mere 98 bytes.
- **0 dependencies.** There is exactly one thing to audit for security — the code that actually governs access.
- **Runs anywhere JavaScript does.** No ties to Node built-ins, the filesystem, or dynamic evaluation. Workers, Deno, Bun and any edge runtime are supported natively.

```sh
npm install @vetojs/core
```

## How it works: three simple steps

```ts
import { defineAbilities, type, createRules, buildAbility } from "@vetojs/core";

// 1. Declare your resource schema once.
const ac = defineAbilities({
	resources: {
		post: {
			schema: type<{ id: string; authorId: string; status: "draft" | "published" }>(),
			actions: ["read", "update", "publish"],
			relations: { author: { resource: "user", kind: "one" } },
		},
		user: { schema: type<{ id: string; role: string }>(), actions: ["read"] },
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

Typos no longer reach production: if an action, resource, field or operator doesn't match your types, the code simply won't compile.

## Why not CASL?

CASL is an excellent tool and the acknowledged incumbent. But it was built before the era of React Server Components, and class instances sit at its foundation — which is where our architectures part ways. The comparison holds for `@casl/ability@7.0.1`.

| | CASL | @vetojs |
|---|---|---|
| **Server → client** | An ability is a `PureAbility` instance, and RSC refuses to pass it through: *"Only plain objects… Classes or null prototypes are not supported"* ([#999](https://github.com/stalniy/casl/issues/999)). | `ability.rules` is plain JSON. The client rebuilds the ability from it with ease. |
| **Tagging an instance** | `subject("Post", post)` **mutates** `post` itself, adding a non-enumerable tag. `JSON.stringify` therefore drops it, and the type is lost silently. | `can("update", "post", post)` takes the resource name as a plain argument. No wrappers, no mutated data. |
| **Types** | Actions do narrow per resource, but the unions are often hand-written (for example: `MongoAbility<["create" \| "manage", "campaign"] \| ["create" \| "delete", "user"]>`). | Actions, resources and shapes are all inferred automatically from one `defineAbilities` declaration. |
| **Database queries** | `accessibleBy` needs a separate adapter per ORM. SQL support has been [open since 2017](https://github.com/stalniy/casl/issues/8), and each new ORM major means waiting for an adapter release. | `ability.where()` returns a standard condition tree that is easy to walk yourself. `@vetojs/drizzle` turns it straight into SQL, with a guarantee: the query returns exactly what `can()` allows. |
| **Dependencies** | 4 | 0 |
| **Bundle size** | ~7.0 kB for the whole package (6.3 kB gzip to build and check). Code you never use ships anyway — `$elemMatch`, for instance, even if your policy never touches it. | 4.1 kB gzip for the same check with the incoming rules validated. 2.9 kB without validation. The whole package is 4.9 kB. |
| **Bad data** | `$gt: 50` can let a `views: "100"` row through, and a `deny` on `secret: true` won't fire for `secret: "true"`. | A value that doesn't fit its condition is strictly "unknown". An `allow` won't fire, and a `deny` will fire reliably. |

Coming from CASL? [Migrating from CASL](docs/migrate-from-casl.md) maps the API across in detail, names the operators that have no equivalent, and covers the two behaviour differences that can change what your policy does.

## The package ecosystem

| Package | Status | What it does |
|---|---|---|
| [`@vetojs/core`](packages/core) | ✅ Ready | The core: rules, evaluation, operators, and building conditions for queries. No dependencies. |
| [`@vetojs/react`](packages/react) | ✅ Ready | [`<Can>`, `useAbility`, `AbilityProvider`](docs/react.md) — the same rules decide which UI elements are available. |
| [`@vetojs/next`](packages/next) | ✅ Ready | [`createGuard`](docs/next.md) — one wrapper for server actions: works out the user, loads the row, validates the payload, and only then lets the action run. |
| [`@vetojs/drizzle`](packages/drizzle) | ✅ Ready | [Conditions → SQL `WHERE`](docs/drizzle.md), relations → `EXISTS`. Postgres for now. |
| `@vetojs/prisma` · `@vetojs/kysely` | 🔜 Planned | Support for further ORM adapters and dialects. |

## One source of truth, from the database to the client

At the database level we ask only for what the user is permitted to see: the rules convert automatically into a `WHERE` clause.

```ts
const rows = await db.select().from(posts)
	.where(schema.filter(ability, "read", "post"));
```

On the server — inside a server component — we check access to a specific row and safely hand the rules to the client as flat data:

```tsx
const ability = buildAbility(ac, policyFor(user));
if (!ability.can("read", "post", post)) notFound();

return (
	<AbilityProvider rules={ability.rules}>
		<Toolbar post={post} />
	</AbilityProvider>
);
```

On the client those very same rules drive the interface, hiding or showing the controls:

```tsx
"use client";

<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
	<EditButton />
</Can>
```

Server and client both rely on one and the same array of JSON rules, so the access logic simply cannot drift apart.

## What's next

- **[Documentation](docs/README.md)** — a detailed page per concept: from declaring resources to SQL filtering.
- **[For agents](docs/for-agents.md)** — the whole API on one page, sized to fit an AI assistant's context (plus the [llms.txt](llms.txt) file).
- **Examples** — three runnable demos over one multi-tenant domain: [react-spa](examples/react-spa) (rules crossing to the client), [next-app](examples/next-app) (RSC, server actions, SQL filtering) and [drizzle-pg](examples/drizzle-pg) (`can()` and `WHERE` compared row by row).

## Development

```sh
pnpm install
pnpm test           # vitest
pnpm test:coverage
pnpm typecheck      # tsc across the workspace
pnpm check          # biome
pnpm knip           # unused-export gate
```

## License

MIT
