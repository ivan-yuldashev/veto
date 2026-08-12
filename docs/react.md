# `@vetojs/react` — gating the UI

**[English](react.md) · [Русский](react.ru.md)**

The same rules that guard your server decide what the user can reach in the UI. Rules travel to the client as flat data, and three bindings read them.

```sh
npm add @vetojs/react @vetojs/core
```

React 18 or newer. `@vetojs/core` is a peer dependency, so your app resolves it once and the bindings share that copy.

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

## `useCan` — one question, one subscription

`useAbility` hands back the whole object, so every component holding it wakes up whenever the rules change. `useCan` subscribes to a single verdict instead and re-renders only when *that* answer flips:

```tsx
const canEdit = useCan("update", "post", post);
```

On a list of 50 gated rows where switching actors changes exactly one verdict, `useAbility` re-renders all 50 and `useCan` re-renders 1. `<Can>` uses it internally, so it already behaves this way. Reach for `useAbility` when you need more than a yes or no — `permittedFields`, `validate`, a filter over many rows.

## `useSetRules` — switch actors without re-rendering the page

Passing new `rules` to the provider works, but it goes through React state in an ancestor, so that ancestor re-renders and takes its whole subtree with it. On the same 50-row list that is 101 re-renders for one changed verdict — and none of them come from `<Can>`; it is ordinary parent-to-child propagation.

`useSetRules` writes to the store directly instead:

```tsx
const setRules = useSetRules();

const onSwitchActor = async (id: string) => {
	const { rules } = await fetchActor(id);
	setRules(rules);
};
```

Nothing above re-renders — not the provider, not the list — and only the rows whose verdict moved update. Measured on that list: provider 0, ungated rows 0, gated rows 1.

Use the `rules` prop to seed the tree from the server, and `useSetRules` for changes that happen without a new request.

## Hiding is not protecting

A hidden button is a courtesy to the user, not a security boundary — the request it would have sent can still be made by hand. Every action still needs its check on the server:

- rows: filter in the database with [`ability.where`](./where.md);
- mutations: gate with [`canMutate` / `validatePayload`](./mutations.md).

The value of sharing one array of rules is that both sides read one source, so the UI can't drift out of step with what the server will actually allow.

## Server components

**On the server you do not need any of the above.** No context, no provider, no client boundary — you already have the ability, so ask it:

```tsx
import { Can } from "@vetojs/react/server";

const ability = await getAbility();
if (!ability.can("read", "post", post)) notFound();

return (
	<Can ability={ability} I="update" a="post" this={post} fallback={<ReadOnly />}>
		<EditForm post={post} />
	</Can>
);
```

This `<Can>` carries no `"use client"` and calls no hooks. Both branches are decided while rendering, so **neither reaches the browser** — the client receives only the resolved output. There is no factory either: the resource map is inferred from the ability you pass, so actions are still checked against the resource as you type.

Build the ability once per request rather than per component. In Next, that is React's `cache`:

```ts
export const getAbility = cache(async () =>
	buildAbility(ac, policyFor(await getActor())),
);
```

Reach for the client bindings only where the UI has to *react* — an optimistic toggle, a role switcher, anything that changes without a new request. Then hand the rules across:

```tsx
<AbilityProvider rules={ability.rules}>
	<Toolbar post={post} />
</AbilityProvider>
```

Only the rules array crosses the boundary — plain JSON, nothing to serialize around. That is the property that makes this work at all: an ability here is data plus closures, never a class instance. A class-based ability cannot cross that boundary, which is where libraries built on one run out of road.

## Why it works this way

- **A factory, not a global.** Typed bindings need your `ac`, and a module-scoped import can't receive it. One local module re-exporting the three bindings keeps the rest of the app import-clean.
- **`rules` or `ability`, never both.** The server path ships data; the client path may already have an ability. Allowing both would raise the question of which wins.
- **`useAbility` throws when unprovided.** Returning a deny-everything ability would look like a policy decision and hide the wiring mistake.
- **`<Can>` renders `children` or `fallback`, nothing else.** No wrapper element, so it drops into flex and grid layouts without disturbing them.
- **Two entry points, because `"use client"` marks a whole module.** There is no way for one module to be both, so the server component lives at `@vetojs/react/server` and shares nothing with the client one but a type. The alternative — one client `<Can>` everywhere — is what forces a server component to become a client component just to hide a button.
- **The client `<Can>` also takes an `ability` prop.** Pass it and the context is ignored, which is the escape hatch when a subtree has its own ability or you would rather not mount a provider at all. With neither, it throws instead of assuming.

## Source

[`context.ts`](../packages/react/src/context.ts) · [`types.ts`](../packages/react/src/types.ts) · tests: [render](../packages/react/tests/render.test.ts), [context](../packages/react/tests/context.test.ts), [provider](../packages/react/tests/provider.test.ts)
