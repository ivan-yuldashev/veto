# Declaring resources — `defineAbilities`

**[English](define-abilities.md) · [Русский](define-abilities.ru.md)**

Everything the library knows about your resources comes from one declaration: what resources exist, what you can do to them, and how they relate. Every type downstream — resource names, the actions valid for each one, the shape of a row — is inferred from it. You never hand-write a union or a tuple type.

```ts
import { defineAbilities, shape } from "@vetojs/core";

const ac = defineAbilities({
	resources: {
		post: {
			schema: shape<Post>(),
			actions: ["read", "create", "update", "delete", "publish"],
			relations: {
				blog: { resource: "blog", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		blog: { schema: shape<Blog>(), actions: ["read", "update"] },
		comment: { schema: shape<Comment>(), actions: ["read", "create", "delete"] },
	},
});
```

At runtime this returns the `resources` object unchanged — it is a typed identity function. All of its value is in the type it captures.

## What a resource carries

| Field | Meaning |
|---|---|
| `schema` | the row's own fields. `shape<T>()` is a zero-runtime marker that only carries the type; pass a real [Standard Schema](https://standardschema.dev) instead if you also want runtime validation — [see below](#swapping-typet-for-a-real-schema) |
| `actions` | what can be done to this resource, captured as literals |
| `relations` | named links to other resources — `{ resource, kind }`, where `kind` is `"one"` or `"many"` |

Relation **names** are yours to choose; the **target** must be a resource you declared. Names live in their own namespace, separate from schema fields — the same split your ORM makes between columns and `include`/`with`.

## Swapping `shape<T>()` for a real schema

`shape<T>()` is erased at build time — it carries the shape into the type system and checks nothing at runtime. Pass a [Standard Schema](https://standardschema.dev) instead and the same declaration also validates incoming data:

```ts
import { z } from "zod";

const post = z.object({
	id: z.string(),
	authorId: z.string(),
	status: z.enum(["draft", "published"]),
	views: z.number(),
});

const ac = defineAbilities({
	resources: { post: { schema: post, actions: ["read", "update"] } },
});
```

`ShapeOf<AC, "post">` is now inferred from the schema, so nothing is declared twice, and `ability.validate` starts doing real work:

```ts
ability.validate("post", { id: "p1", authorId: "u1", status: "published", views: 10 });
// → { ok: true, value: … }

ability.validate("post", { id: 1, status: "archived" });
// → { ok: false, issues: […] }
```

That is the other half of handling untrusted input, and the two halves answer different questions:

| | Question |
|---|---|
| `validate` | is this even a valid post? |
| `validatePayload` | may this actor write these fields and values? — see [writes](./mutations.md) |

Running only one of them is the common mistake. A payload can be perfectly shaped and still touch a field the actor may not write; it can also be permitted by the policy and still be nonsense.

> **The schema must validate synchronously.** Verified against Standard Schema v1: **Zod, Valibot and ArkType** work. **Yup does not** — it implements the standard, but its validation is async, and `validate` throws rather than return a promise you might forget to await.

Nothing else changes. Rules, evaluation and `can()` never consult the schema — the engine reads fields structurally and is total on any input, so a schema only ever adds a check at the boundary.

## What you get back

```ts
type AC = typeof ac;

ResourceName<AC>;      // "post" | "blog" | "comment"
ActionFor<AC, "post">; // "read" | "create" | "update" | "delete" | "publish" | "manage"
ShapeOf<AC, "post">;   // Post
```

These flow into `createRules(ac)` and `buildAbility(ac, …)`, which is why a typo in an action name or a field is a compile error rather than a rule that silently never matches.

## Why it works this way

- **`const` type parameter instead of `as const`.** The literal action names are captured for you, so the declaration stays clean.
- **Each resource keeps its own shape.** A single shared shape parameter would collapse resources of different shapes into one; here `ShapeOf` reads each `schema` individually.
- **`type` is the former name of `shape`.** It is deprecated and still exported: the two are the same function, so rename whenever it suits you. `type` collides with the TypeScript modifier, so an import line carrying both reads like a typo and sorters order it differently between runs.
- **`schema` carries a type, it isn't data.** `shape<T>()` exists purely to smuggle `T` into the type system at zero runtime cost. Swap in a Standard Schema when you want `ability.validate` to actually check incoming data — see [ability](./ability.md).
- **Rules referencing something you didn't declare are caught.** With typed factories it is a compile error. For rules arriving as JSON at runtime, the same check happens at the trust boundary — see [parse](./parse.md).

## Source

[`api/define-abilities.ts`](../packages/core/src/api/define-abilities.ts) · [`api/schema.ts`](../packages/core/src/api/schema.ts) · [tests](../packages/core/tests/api/define-abilities.test.ts)
