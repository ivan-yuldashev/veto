# Declaring resources — `defineAbilities`

**[English](define-abilities.md) · [Русский](define-abilities.ru.md)**

Everything the library knows about your resources comes from one declaration: what resources exist, what you can do to them, and how they relate. Every type downstream — resource names, the actions valid for each one, the shape of a row — is inferred from it. You never hand-write a union or a tuple type.

```ts
import { defineAbilities, type } from "@vetojs/core";

const ac = defineAbilities({
	resources: {
		post: {
			schema: type<Post>(),
			actions: ["read", "create", "update", "delete", "publish"],
			relations: {
				blog: { resource: "blog", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		blog: { schema: type<Blog>(), actions: ["read", "update"] },
		comment: { schema: type<Comment>(), actions: ["read", "create", "delete"] },
	},
});
```

At runtime this returns the `resources` object unchanged — it is a typed identity function. All of its value is in the type it captures.

## What a resource carries

| Field | Meaning |
|---|---|
| `schema` | the row's own fields. `type<T>()` is a zero-runtime marker that only carries the type; pass a real [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType) instead if you also want runtime validation |
| `actions` | what can be done to this resource, captured as literals |
| `relations` | named links to other resources — `{ resource, kind }`, where `kind` is `"one"` or `"many"` |

Relation **names** are yours to choose; the **target** must be a resource you declared. Names live in their own namespace, separate from schema fields — the same split your ORM makes between columns and `include`/`with`.

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
- **`schema` carries a type, it isn't data.** `type<T>()` exists purely to smuggle `T` into the type system at zero runtime cost. Swap in a Standard Schema when you want `ability.validate` to actually check incoming data — see [ability](./ability.md).
- **Rules referencing something you didn't declare are caught.** With typed factories it is a compile error. For rules arriving as JSON at runtime, the same check happens at the trust boundary — see [parse](./parse.md).

## Source

[`api/define-abilities.ts`](../packages/core/src/api/define-abilities.ts) · [`api/schema.ts`](../packages/core/src/api/schema.ts) · [tests](../packages/core/tests/api/define-abilities.test.ts)
