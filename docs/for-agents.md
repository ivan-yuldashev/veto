# For agents

**[English](for-agents.md) · [Русский](for-agents.ru.md)**

Everything needed to write correct Veto code, in one page. If you are generating code for someone else's project, read this first — the last section lists the mistakes that look plausible and are wrong.

## Install

```sh
npm add @vetojs/core          # the engine
npm add @vetojs/react         # optional: <Can>, useAbility, AbilityProvider
```

ESM only, Node 20+. `@vetojs/react` needs React 18+ as a peer.

## The whole flow

```ts
import { defineAbilities, type, createRules, buildAbility } from "@vetojs/core";

// 1. Declare the resource schema once. Every type below is inferred from this.
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

// 2. A policy is a pure function of the actor returning an array of rules.
const { allow, deny } = createRules(ac);

const policyFor = (user: { id: string }) => [
  allow("read", "post", { where: { status: "published" } }),
  allow(["update", "publish"], "post", { where: { authorId: user.id } }),
  deny("update", "post", { payload: { fields: ["featured"] } }),
];

// 3. Build once per request, then check access.
const ability = buildAbility(ac, policyFor(currentUser));

ability.can("update", "post", post);
```

## API surface

### `@vetojs/core`

| Export | Signature | Purpose |
|---|---|---|
| `defineAbilities` | `({ resources }) => AC` | declares resources, actions, relations |
| `type<T>()` | `() => Schema<T>` | carries a row shape; swap for a Standard Schema to validate at runtime |
| `createRules` | `(ac, { maxDepth? }?) => { allow, deny }` | typed rule factories |
| `buildAbility` | `(ac, rules) => AbilitySet` | turns a policy into the object you call |
| `parseRules` | `(json, vocabulary) => RuleParseResult` | validates untrusted rule JSON |
| `toVocabulary` | `(ac) => Vocabulary` | serializable names for storing a vocabulary |
| `markLoaded` | `(row, relation, value) => row` | states a relation is loaded |
| `ConditionOperator` | const object | `eq ne in nin gt gte lt lte contains exists` |
| `ForbiddenError` | class | `.action`, `.resource`, `.violations?` |
| `RelationNotLoadedError` | class | `.relation` |

Methods on `ability`:

| Method | Returns | Use for |
|---|---|---|
| `can(action, resource, row?)` | `boolean` | branching |
| `cannot(action, resource, row?)` | `boolean` | early exits |
| `authorize(action, resource, row?)` | `void`, throws `ForbiddenError` | server boundaries |
| `canMutate(action, resource, row)` | `boolean` | may this row be written |
| `validatePayload(action, resource, row, data)` | `{ ok: true, data } \| { ok: false, violations }` | may this data be written |
| `permittedFields(action, resource, fields)` | subset of `fields` | driving a form |
| `where(action, resource)` | `ConditionNode` | database filter |
| `validate(resource, data)` | `{ ok: true, value } \| { ok: false, issues }` | schema check |
| `rules` | `CheckedRules` | ship to the client |

### `@vetojs/react`

```ts
// src/veto.ts — call the factory once, import bindings from here
import { createVetoContext } from "@vetojs/react";
export const { AbilityProvider, useAbility, Can } = createVetoContext(ac);
```

```tsx
<AbilityProvider rules={ability.rules}>
  <Can I="update" a="post" this={post} fallback={<Disabled />}>
    <EditButton />
  </Can>
</AbilityProvider>
```

## Writing conditions

Sibling keys are ANDed. A bare value means equals.

```ts
where: {
  status: "published",                  // eq
  views: { gte: 100 },                  // operator object
  title: { contains: "release" },        // strings only
  authorId: { in: ["u1", "u2"] },
  deletedAt: { exists: false },
  author: { role: "admin" },            // to-one relation
  comments: { none: { spam: true } },   // to-many: some | every | none
  or: [{ pinned: true }, { views: { gt: 1000 } }],
}
```

Operators by field type: any field gets `eq ne in nin exists`; `number` and `Date` also get `gt gte lt lte`; `string` also gets `contains`.

## Checking writes

Two questions, kept separate:

```ts
if (!ability.canMutate("update", "post", row)) throw new ForbiddenError("update", "post");

const result = ability.validatePayload("update", "post", row, data);
if (!result.ok) return badRequest(result.violations); // [{ field, reason }]

await db.update(posts).set(result.data).where(eq(posts.id, row.id));
```

Use `result.data`, not the raw input — it is the validated copy.

## Filtering in the database

```ts
const filter = ability.where("read", "post"); // a plain condition tree
```

The filter selects exactly the rows `can()` allows. Hand it to a database adapter; without an adapter, treat it as data — do not try to interpret it by hand.

## Rules from outside

```ts
const result = parseRules(JSON.parse(raw), ac);
if (!result.ok) throw new Error(result.errors.join("\n"));
const ability = buildAbility(ac, result.rules);
```

`buildAbility` expects rules that passed a check — from `createRules` or from `parseRules` **with a vocabulary**. The type system enforces this wherever the value still has a type (see the note below about `any`).

## Mistakes to avoid

These compile-or-look fine and are wrong:

**A bare array on an array field.** It means "equals this array", compared by reference, so it never matches a row from a database. The type rejects it; use an operator.

```ts
where: { tags: ["a", "b"] }          // ✗ rejected by the type system
where: { tags: { in: [["a"], ["b"]] } }  // ✓ membership
```

**Passing raw JSON to `buildAbility`.** Always go through `parseRules(json, ac)`.

```ts
buildAbility(ac, JSON.parse(raw));                       // ✗ compiles, but unchecked
buildAbility(ac, parseRules(JSON.parse(raw), ac).rules); // ✓
```

Note the comment: this one **does** compile, because `JSON.parse` returns `any`. The type system rejects a hand-written literal or a plain `Rule[]`, but nothing can catch a value that discarded its type. Do not rely on the compiler here.

**Using the row-less check as a row guard.** `can("update", "post")` and `authorize("update", "post")` answer *could this be allowed for some row* — they are for rendering decisions, not for guarding an operation on a specific row. If you have the row, pass it.

**Forgetting to load a relation the rule needs.** If a rule reads `post.author.role`, the author must be on the object, or `can()` throws `RelationNotLoadedError`. Load it in the query:

```ts
const post = await db.query.posts.findFirst({ with: { author: true } });
```

For hand-assembled objects use `markLoaded(post, "author", author)`; pass `null` for loaded-but-empty. Passing `undefined` throws — that is what "not loaded" means.

**Treating a hidden button as protection.** `<Can>` and `permittedFields` decide what to render. The request they hide can still be sent by hand, so the server needs its own check every time.

**Expecting a deny to step aside on bad data.** A `deny` fires on "unknown" — a wrong-typed value cannot slip past a prohibition. Malformed data can only ever narrow access, never widen it.

**Reaching for a config option to change precedence.** Deny always wins and everything not allowed is denied; neither is configurable. That is what lets the same rules compile to SQL.

## Framework placement

| Where | What to use |
|---|---|
| Server component / route handler | `buildAbility` per request, then `can` / `authorize` |
| Fetching a list | `ability.where(...)` in the query, never filter in JS after the fact |
| Mutation handler | `canMutate` + `validatePayload` |
| Client component | `<AbilityProvider rules={ability.rules}>` and `<Can>` / `useAbility` |
| Crossing server → client | send `ability.rules`; it is plain JSON |

## Full documentation

Per-concept pages, English and Russian, are indexed in [docs/README.md](./README.md).
