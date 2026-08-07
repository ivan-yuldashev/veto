# `@vetojs/react` — gating the UI

**[English](react.md) · [Русский](react.ru.md)**

The same rules that guard your server decide what the user can reach in the UI. Rules travel to the client as flat data, and three bindings read them.

```sh
npm add @vetojs/react
```

React 18 or newer.

## Create the bindings once

`createVetoContext(ac)` closes over your declarations and returns bindings that know your resources. Do this in one module and import from it everywhere:

```ts
// src/authz.ts
import { createVetoContext } from "@vetojs/react";
import { ac } from "./abilities";

export const { AbilityProvider, useAbility, Can } = createVetoContext(ac);
```

This step exists because a module-level import can't carry your `ac` type — a factory can. The payoff is that `<Can>` autocompletes actions per resource and rejects the ones that don't exist.

## Provide the ability

Wrap the tree once, near the root:

```tsx
<AbilityProvider rules={rules}>
	<App />
</AbilityProvider>
```

`rules` is the plain array from `ability.rules` — exactly what the server sends. The provider builds the ability itself and memoises it, so a re-render doesn't rebuild the policy.

If you already have an ability on the client, pass that instead:

```tsx
<AbilityProvider ability={ability}>
```

The two props are mutually exclusive — passing both is a type error.

> Rules arriving from a server are untrusted input like any other. Validate them with [`parseRules`](./parse.md) at the boundary; the provider takes checked rules for exactly that reason.

## `<Can>` — render if allowed

```tsx
<Can I="update" a="post" this={post}>
	<EditButton />
</Can>
```

Reads as a sentence: *I* may **update** *a* **post**, this one. Without `fallback` a denied check renders nothing; with it you can show a disabled state instead:

```tsx
<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
	<EditButton />
</Can>
```

Drop `this` when there's no row yet — for a "New post" button, the question is whether the action is possible at all:

```tsx
<Can I="create" a="post">
	<NewPostButton />
</Can>
```

Everything is checked against your declarations:

```tsx
<Can I="archive" a="post">   {/* ✗ "post" has no "archive" action */}
<Can I="update" a="posts">   {/* ✗ no such resource */}
<Can I="update" a="post" this={user}>  {/* ✗ wrong shape for "post" */}
```

## `useAbility` — everything else

For lists, disabled states, and any check that isn't "render or don't":

```tsx
const ability = useAbility();

const visible = posts.filter((post) => ability.can("read", "post", post));
const writable = ability.permittedFields("update", "post", ["title", "status"]);

<input disabled={!writable.includes("title")} />
```

It returns the full [`ability`](./ability.md), so `can`, `cannot`, `permittedFields` and the rest are all available. Called outside a provider it throws immediately, rather than silently behaving as if nothing is permitted.

## Hiding is not protecting

A hidden button is a courtesy to the user, not a security boundary — the request it would have sent can still be made by hand. Every action still needs its check on the server:

- rows: filter in the database with [`ability.where`](./where.md);
- mutations: gate with [`canMutate` / `validatePayload`](./mutations.md).

The value of sharing one array of rules is that both sides read one source, so the UI can't drift out of step with what the server will actually allow.

## Server components

The whole package is client-side — `createVetoContext` uses context and hooks. In a React Server Components app the split is:

```tsx
// server component
const ability = buildAbility(ac, policyFor(user));
if (!ability.can("read", "post", post)) notFound();

return (
	<AbilityProvider rules={ability.rules}>
		<Toolbar post={post} />
	</AbilityProvider>
);
```

Only the rules array crosses the boundary — plain JSON, nothing to serialize around. That is the property that makes this work at all: an ability here is data plus closures, never a class instance.

## Why it works this way

- **A factory, not a global.** Typed bindings need your `ac`, and a module-scoped import can't receive it. One local module re-exporting the three bindings keeps the rest of the app import-clean.
- **`rules` or `ability`, never both.** The server path ships data; the client path may already have an ability. Allowing both would raise the question of which wins.
- **`useAbility` throws when unprovided.** Returning a deny-everything ability would look like a policy decision and hide the wiring mistake.
- **`<Can>` renders `children` or `fallback`, nothing else.** No wrapper element, so it drops into flex and grid layouts without disturbing them.

## Source

[`context.ts`](../packages/react/src/context.ts) · [`types.ts`](../packages/react/src/types.ts) · tests: [render](../packages/react/tests/render.test.ts), [context](../packages/react/tests/context.test.ts), [provider](../packages/react/tests/provider.test.ts)
