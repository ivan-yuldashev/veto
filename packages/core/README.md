# @vetojs/core

The engine of [`@vetojs`](https://github.com/ivan-yuldashev/veto#readme) — **[English](README.md) · [Русский](README.ru.md)**.

**Type-safe authorization with no classes and no hidden state.**

A policy is a pure function that takes a user (and whatever else you need) and returns an array of rules — plain JSON. The same rules run on the server and the client, are checked with full type inference, and turn into a database `WHERE` clause.

- **Rules are flat data.** Serialize them, ship them to the client, store them in a database.
- **No hidden state.** No class instances, nothing shared between requests.
- **0 dependencies.** No classes at all, bar two error types.

```sh
npm add @vetojs/core
```

ESM only, Node 20+.

## Quick start

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

## What's in the box

| Export | What it does |
|---|---|
| [`defineAbilities`](https://github.com/ivan-yuldashev/veto/blob/main/docs/define-abilities.md) | Your resource schema: shapes, actions, relations. The single source every type infers from. |
| `type<T>()` | Declares a resource shape. Pass a [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType) instead to also validate data at runtime. |
| [`createRules(ac)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/create-rules.md) | Typed `allow` / `deny` factories — action, resource and `where` all checked against your schema. |
| [`buildAbility(ac, rules)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/ability.md) | Turns an array of rules into the object you call. |
| [`parseRules(json, ac)`](https://github.com/ivan-yuldashev/veto/blob/main/docs/parse.md) | The gate for rule JSON arriving from a database or the network. |
| [`markLoaded`](https://github.com/ivan-yuldashev/veto/blob/main/docs/relations.md) | States that a relation is loaded, for data your ORM didn't assemble. |
| `ConditionOperator` | `eq`, `ne`, `in`, `nin`, `gt`, `gte`, `lt`, `lte`, `contains`, `exists`. |
| `ForbiddenError`, `RelationNotLoadedError` | The only two classes. |

What `ability` gives you:

| | |
|---|---|
| `can` / `cannot` / `authorize` | may this happen — with a row, or without one |
| `canMutate` / `validatePayload` | [may this be written](https://github.com/ivan-yuldashev/veto/blob/main/docs/mutations.md) — which fields, which values |
| `permittedFields` | which fields a form should enable |
| `where` | [the condition for a database query](https://github.com/ivan-yuldashev/veto/blob/main/docs/where.md) |
| `validate` | does incoming data match the resource's schema |
| `rules` | the underlying array of rules — flat data, ready to ship to the client |

## Safe on bad data

Real rows carry `NULL`s, and real payloads carry strings where numbers belong. A condition that can't be honestly answered returns **unknown** rather than guessing — and unknown fails closed in both directions: an `allow` grants nothing, a `deny` still fires. Corrupt data can only ever narrow access. ([Details](https://github.com/ivan-yuldashev/veto/blob/main/docs/operators.md).)

Relations get stricter treatment. If a rule looks at `post.author.role`, that data has to be on the object — and if you never loaded it, `can()` **throws** instead of quietly answering "doesn't match". A forgotten `include` is a bug in your query, not a silent policy change.

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
ability.can("update", "post", post);
```

The engine reads the convention your ORM already follows: `undefined` means not loaded, `null` means loaded and empty. For hand-assembled data, say it explicitly with `markLoaded`. ([Details](https://github.com/ivan-yuldashev/veto/blob/main/docs/relations.md).)

## Learn more

- **[Documentation](https://github.com/ivan-yuldashev/veto/blob/main/docs/README.md)** — a page per concept, from declaring resources to filtering in SQL.
- **[For agents](https://github.com/ivan-yuldashev/veto/blob/main/docs/for-agents.md)** — the whole API in one page, for coding assistants.
- **Examples** — runnable demos over one multi-tenant domain ship alongside the adapters.

## License

MIT
