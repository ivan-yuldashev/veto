# Checking access — `buildAbility`

**[English](ability.md) · [Русский](ability.ru.md)**

`buildAbility(ac, rules)` turns an array of rules into the object you actually call. Every method is bound to your resource schema, so the action, the resource and the row shape are all checked as you type.

```ts
const ability = buildAbility(ac, policyFor(user));

ability.can("update", "post", post);        // may this actor update this row?
ability.can("update", "post");              // could they update any post at all?
ability.authorize("update", "post", post);  // same, but throws instead of returning false
```

It holds no state and mutates nothing — `ability.rules` is the array of rules it was built from, ready to be serialised and sent to the client.

## What's on it

| Method | Answers |
|---|---|
| `can` / `cannot` | may this action happen — with a row, or without one |
| `authorize` | same as `can`, but throws `ForbiddenError` |
| `canMutate` | may this row be written — see [mutations](./mutations.md) |
| `validatePayload` | may *this data* be written |
| `permittedFields` | which fields the UI should let them edit |
| `where` | the condition for a database query — see [where](./where.md) |
| `validate` | does incoming data match the resource's schema |
| `rules` | the underlying array, plain JSON |

## One decision, three ways to report it

`can`, `cannot` and `authorize` all evaluate **the same thing**. They differ only in how the answer comes back, so you can pick the one that fits the call site:

```ts
if (ability.can("update", "post", post)) { … }                  // a boolean, to branch on
if (ability.cannot("update", "post", post)) return notFound();  // an early exit
ability.authorize("update", "post", post);                      // throws, at a boundary
```

`authorize` saves you writing `if (!can(…)) throw new ForbiddenError(action, resource)` and guarantees every refusal looks the same.

## The real distinction: with a row or without

That axis is separate from the three above, and it is the one that changes the question being asked.

**With a row** the answer is exact — conditions are evaluated against it.

**Without a row** the answer is optimistic: *could this be allowed for some row?* That is what UI gating needs, when you decide whether to render a button before anything exists to check. It is true when some `allow` covers the action and no blanket `deny` overrides it.

```ts
ability.can("create", "post");        // show the "New post" button?
ability.can("update", "post", post);  // enable Edit on this row?
```

Both forms are available on all three methods, including `authorize` — a route handler guarding "may this user create posts at all" has no row to pass.

> **The row-less form answers a weaker question, and nothing stops you using it by mistake.** If the operation touches a specific row, pass that row. `authorize("update", "post")` compiles and will happily pass for an actor who may update *some* post — but not this one.

## Catching the refusal

```ts
import { ForbiddenError } from "@vetojs/core";

try {
	ability.authorize("delete", "post", post);
} catch (error) {
	if (ForbiddenError.is(error)) {
		error.action;     // "delete"
		error.resource;   // "post"
		error.violations; // set only for payload failures
	}
}
```

Handy in a route handler or server action where a framework error boundary turns the throw into a 403.

Use `ForbiddenError.is` rather than `instanceof`. If two copies of `@vetojs/core` ever end up in one tree, the error has two class identities and `instanceof` answers `false` for a perfectly valid refusal — a 403 silently becomes a 500. The brand behind `is` is a registered symbol, so it survives that.

## `permittedFields` — for forms

```ts
ability.permittedFields("update", "post", ["title", "status", "views"]);
// → ["title", "status"]
```

You pass the field universe rather than getting it for free, because a schema can't be asked for its keys — `type<T>()` is erased at runtime, and Standard Schema doesn't enumerate them either.

This drives the UI. The server still enforces with `validatePayload`; a disabled input is a courtesy, not a control.

## `validate` — shape, not permission

```ts
const result = ability.validate("post", input);
if (!result.ok) return badRequest(result.issues);
// result.value is validated and narrowed
```

This is the other half of handling untrusted input: `validate` answers *is this even a valid post?*, `validatePayload` answers *is this actor allowed to write it?* Both, in that order, is the complete story.

It runs the resource's schema, so it only does something real when you passed a Standard Schema (Zod, Valibot, ArkType) to `defineAbilities`. A phantom `type<T>()` still rejects non-objects but can't check fields. Async schemas are not supported — a `validate` returning a promise throws.

Unknown resources fail rather than pass through, as a gate should.

## Types are guidance; the engine is the guard

Methods take typed rows so your editor autocompletes and typos don't compile. That typing expresses *intent* — it isn't what keeps you safe.

Safety comes from the engine being total: a non-object is denied, a wrong-typed field is "unknown" and fails closed both ways. So a row that doesn't match its declared shape can only ever cause *more* denial, never a crash and never a grant.

When data of unverified shape has to enter, use the gate for its kind rather than an `as unknown as` cast:

| Data | Gate |
|---|---|
| rule JSON from a database or network | [`parseRules(json, ac)`](./parse.md) |
| a row or payload of unverified shape | `ability.validate(resource, data)` |

## Rules the registry doesn't recognise

`buildAbility` doesn't throw, drop, or warn on them — by the time rules reach it they are trusted, and the checking already happened upstream: at compile time via `createRules`, or at runtime via `parseRules` with a vocabulary. That's also why `buildAbility` only accepts checked rules — see [parse](./parse.md).

## Why it works this way

- **Plain data and closures, never a class.** Nothing to serialise around, nothing to mutate, safe to build per request in a server component.
- **`authorize` returns nothing.** It's a guard, not a transformer — the row you passed in is already typed.
- **`canMutate` and `validatePayload` take a partial row**, because a pre-insert candidate has no database-generated `id` or `createdAt` yet, and demanding a complete row would force a cast at every create.
- **`ability.rules` is the wire format.** Send it to the client, hand it to `<AbilityProvider rules={…}>`, and the same rules drive the UI.

## Source

[`api/ability.ts`](../packages/core/src/api/ability.ts) · [tests](../packages/core/tests/api/ability.test.ts)
