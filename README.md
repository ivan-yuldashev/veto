# @vetojs

[English](README.md) | [Русский](README.ru.md)

**Type-safe authorization with no classes and no hidden state.**

A policy is a pure function that takes a user (and whatever else you need) and returns an array of rules — plain JSON. That array crosses the server/client boundary as-is. The same data checks access with full type inference and turns into a SQL `WHERE` for the database.

- **Works with React Server Components.** Rules are flat data: ship them from server to client as-is.
- **Compiles to SQL.** The same policy that answers `can()` becomes a `WHERE` clause, so the database returns exactly the rows the user may see.
- **Safe on bad data.** A wrong-typed or missing value can only ever deny more, never grant.
- **0 dependencies.**

```sh
npm add @vetojs/core
```

## In three steps

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

// 2. A policy is a function returning an array of rules.
const { allow, deny } = createRules(ac);

const policyFor = (user: { id: string }) => [
  allow("read", "post", { where: { status: "published" } }),
  allow(["update", "publish"], "post", { where: { authorId: user.id } }),
];

// 3. Hand the rules to the engine and check access.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);  // ✓ typed against your schema
ability.can("delete", "post");        // ✗ compile error — "post" has no "delete"
```

Typos don't reach production: an action, resource, field or operator that doesn't fit your declarations fails to compile.

## Why not CASL?

CASL is the incumbent, and a good library — but it predates React Server Components and is class-based at its core.

| | CASL | @vetojs |
|---|---|---|
| **Server components** | `subject(obj)` **mutates** your objects to tag their type, which RSC can't serialize | rules are plain JSON; the resource name is just an argument — nothing is wrapped or mutated |
| **Types** | actions aren't narrowed per subject; shapes need hand-written `MongoAbility<[Actions, Subject]>` tuples | actions, resources and shapes all inferred from one declaration |
| **Tagging an instance** | `can("update", subject("Post", post))` | `can("update", "post", post)` |
| **Database queries** | `accessibleBy` (Mongo / Prisma) | `ability.where()` → SQL via `@vetojs/drizzle`, with a tested guarantee that the query returns exactly what `can()` allows |
| **Runtime dependencies** | several | none |
| **Bad data** | conditions can quietly evaluate the wrong way | a value that doesn't fit its condition is "unknown": an `allow` grants nothing and a `deny` still fires |

## Packages

| Package | Status | What it does |
|---|---|---|
| [`@vetojs/core`](packages/core) | ✅ Ready | The engine: rules, evaluation, operators, query compilation. Zero dependencies. |
| [`@vetojs/react`](packages/react) | ✅ Ready | [`<Can>`, `useAbility`, `AbilityProvider`](docs/react.md) — the same rules decide what the user can reach in the UI. |
| `@vetojs/next` | 🚧 In progress | `createGuard` / `withPermission` for server actions and route handlers. |
| `@vetojs/drizzle` | 🚧 In progress | Conditions → SQL `WHERE` (Postgres), relations → `EXISTS`. |
| `@vetojs/prisma` · `@vetojs/kysely` | 🔜 Planned | Further adapters and dialects. |

🚧 — built and tested, but not published yet.

## One set of rules, every layer

Fetch only the rows the user may see — the evaluated rules become a `WHERE` clause:

```ts
const rows = await db.select().from(posts)
  .where(schema.filter(ability, "read", "post"));
```

Guard a server component, then hand the same rules to the client as data:

```tsx
const ability = buildAbility(ac, policyFor(user));
if (!ability.can("read", "post", post)) notFound();

return (
  <AbilityProvider rules={ability.rules}>
    <Toolbar post={post} />
  </AbilityProvider>
);
```

Gate the UI with the very same rules:

```tsx
"use client";

<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
  <EditButton />
</Can>
```

Client and server read the same array of rules, so they can't drift apart.

## Learn more

- **[Documentation](docs/README.md)** — a page per concept, from declaring resources to filtering in SQL.
- **[For agents](docs/for-agents.md)** — the whole API in one page, for coding assistants (see also [llms.txt](llms.txt)).
- **Examples** — runnable demos over one multi-tenant domain ship alongside the adapters.

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
