# Writing policies — `createRules`

**[English](create-rules.md) · [Русский](create-rules.ru.md)**

`createRules(ac)` hands you `allow` and `deny` bound to your resource declarations. From there a policy is an ordinary function returning an array:

```ts
import { createRules } from "@vetojs/core";

const { allow, deny } = createRules(ac);

const policyFor = (actor: User) => [
	allow("read", "post", { where: { status: "published" } }),
	allow(["update", "publish"], "post", {
		where: { authorId: actor.id },
		payload: { fields: ["title", "content", "status"] },
	}),
	deny("update", "post", { payload: { fields: ["featured"] } }),
];
```

Actor values are baked into the rules as plain data at build time — `actor.id` becomes a string in the condition, not a closure. The result is still serialisable JSON.

## Everything is checked against your declarations

```ts
allow("archive", "post");             // ✗ "post" has no "archive" action
allow("read", "posts");               // ✗ no such resource
allow("read", "post", { where: { bogus: 1 } });        // ✗ no such field
allow("read", "post", { where: { views: "many" } });   // ✗ views is a number
allow("read", "post", { where: { title: { gt: 5 } } });// ✗ gt isn't for strings
```

The resource argument drives it: from `"post"` the factory infers which actions exist, what shape a row has, and which relations can be traversed.

## Options

```ts
allow(action, resource, {
	where,     // which rows — fields, operators, and relations (nested)
	payload: {
		fields,      // which fields may be written
		constraints, // which values those fields may take
	},
});
```

`where` accepts the nested shorthand described in [conditions](./conditions.md) and [relations](./relations.md); `constraints` accepts the flat field shorthand ([condition shorthand](./condition-shorthand.md)). Both are compiled to plain JSON immediately, so what you get back is data, not a builder.

Relations nest three levels deep by default. Raise it if your schema is deeper:

```ts
const { allow } = createRules(ac, { maxDepth: 5 });
```

The limit exists to keep TypeScript's inference fast — each level multiplies the work the compiler does on every `where`.

## Rules carry proof of where they came from

`buildAbility` accepts only rules that went through a check — either these factories (verified by the compiler) or [`parseRules`](./parse.md) with a vocabulary (verified at runtime). A hand-written rule literal will not compile:

```ts
buildAbility(ac, [{ effect: "allow", action: "read", resource: "post" }]); // ✗
```

This is a type-level marker with no runtime cost. It exists so that the validation step for rules arriving from a database or network cannot be quietly skipped. When you genuinely need to bypass it — building deliberately broken rules in a test — a visible `as CheckedRules` cast is the escape hatch.

## Why it works this way

- **Pure factories, no builder.** `allow` and `deny` construct a value and return it; a policy is a `map` over your role logic. Trivial to test, trivial to serialise.
- **The shorthand is compiled at construction**, so the stored rule is always the plain form. Nothing shorthand-shaped ever reaches the engine or the database.
- **`createRules` takes the `ac` value, not just its type**, because compiling `where` needs to know at runtime which keys are relations and which are fields.

## Source

[`api/create-rules.ts`](../packages/core/src/api/create-rules.ts) · [tests](../packages/core/tests/api/create-rules.test.ts)
