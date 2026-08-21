# @vetojs/react

[![Socket](https://socket.dev/api/badge/npm/package/@vetojs/react)](https://socket.dev/npm/package/@vetojs/react)
[![Snyk](https://snyk.io/test/npm/@vetojs/react/badge.svg)](https://snyk.io/test/npm/@vetojs/react)

React bindings for [`@vetojs`](https://github.com/ivan-yuldashev/vetojs#readme) — **[English](README.md) · [Русский](README.ru.md)**.

The idea behind this package is simple: the very same rules that reliably guard your server decide which interface elements the user can reach on the client.

```sh
npm install @vetojs/react @vetojs/core
```

React 18 or newer is required.

## Create the strict bindings once

`createVetoContext(ac)` closes over your resource schema and generates a set of React bindings that "know" all your resources and their particulars:

```ts
// src/authz.ts
import { createVetoContext } from "@vetojs/react";
import { ac } from "./abilities";

export const { AbilityProvider, useAbility, useCan, useSetRules, Can } =
	createVetoContext(ac);
```

Why a factory rather than an ordinary import? Strictly typed bindings need your `ac` object (the access schema). Thanks to it, `<Can>` autocompletes the actions available for each specific resource and, at compile time, rejects the ones that don't exist.

## On the server (RSC) you don't need the context

In a server component the `ability` object is already at hand, so you need neither a provider, nor a context, nor a client boundary:

```tsx
import { Can } from "@vetojs/react/server";

const ability = await getAbility();

<Can ability={ability} I="update" a="post" this={post} fallback={<ReadOnly />}>
	<EditForm post={post} />
</Can>
```

The server version carries no directives, no hooks and no factory — the resource schema is derived straight from the `ability` you pass in. Both render branches (allowed and denied) are resolved on the server, so not a single line of extra code is sent to the browser.

## Using it on the client

First wrap your application tree in the provider once, ideally near the root:

```tsx
<AbilityProvider rules={rules}>
	<App />
</AbilityProvider>
```

The `rules` prop takes the array of rules from `ability.rules` — exactly the flat data the server sent. If you already have an `ability` object on the client, you can pass that instead of the rules (but passing both at once is not allowed).

### Declarative UI gating

```tsx
<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
	<EditButton />
</Can>
```

The code reads as a plain English sentence: *"I may update this particular post."* When the row itself doesn't exist yet — a "create" button, say — simply drop the `this` prop, and the engine will check whether the action is possible at all.

### Hooks for logic

```tsx
const ability = useAbility();

const visible = postList.filter((post) => ability.can("read", "post", post));
const writable = ability.permittedFields("update", "post", ["title", "status"]);
```

`useAbility` returns the whole `ability` object, opening up every check there is. One important detail: called outside `AbilityProvider`, it won't pretend that "everything is forbidden" — it throws a clear error immediately.

**Optimising renders with `useCan`:**

When all you need is a yes-or-no answer, reach for `useCan` (the `<Can>` component uses it under the hood). It subscribes to that one verdict and re-renders the component only when the verdict flips. If you have a list of 50 gated rows on screen and the verdict changes for just one of them, `useAbility` forces all 50 elements to re-render, while `useCan` wakes up exactly the one row that matters.

```tsx
const canEdit = useCan("update", "post", post);
```

## Switching actors without extra renders

You can of course pass new `rules` to the provider through props, but since that prop lives in an ancestor component's state, such a switch triggers a full re-render of the ancestor and of the whole tree beneath it. For a targeted update, use the `useSetRules` hook, which writes the data straight into the internal store:

```tsx
const setRules = useSetRules();

const onSwitchActor = async (id: string) => {
	setRules(await fetchRulesFor(id));
};
```

With this approach the components higher up the tree don't re-render, and only the rows whose verdict actually changed update. In short: the `rules` prop is for seeding the rules from the server initially, and `useSetRules` is for switching context dynamically without new heavy renders.

## Hiding a button is not protecting the data

Worth remembering: a hidden button in the interface is a courtesy to the user (UX), not real protection. The network request that button would have sent can still be sent by hand by an attacker. Every action still requires its own mandatory check on the server. The main value of `@vetojs/react` is that the server and the interface read one and the same array of rules — which guarantees the UI can never drift away from the permissions the server actually grants.

## What's next?

- **[Full guide](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/react.md)** — an in-depth look at the provider, `<Can>`, `useAbility`, and the details of working with server components.
- **[About the project](https://github.com/ivan-yuldashev/vetojs#readme)** — the general concept behind `@vetojs` and how its engine is built.

## License

MIT
