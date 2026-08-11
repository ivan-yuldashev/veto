# @vetojs/react

React bindings for [`@vetojs`](https://github.com/ivan-yuldashev/veto#readme) — **[English](README.md) · [Русский](README.ru.md)**.

The same rules that guard your server decide what the user can reach in the UI.

```sh
npm add @vetojs/react @vetojs/core
```

React 18 or newer.

## Create the bindings once

`createVetoContext(ac)` closes over your resource schema and returns bindings that know it:

```ts
// src/authz.ts
import { createVetoContext } from "@vetojs/react";
import { ac } from "./abilities";

export const { AbilityProvider, useAbility, useCan, useSetRules, Can } =
	createVetoContext(ac);
```

A factory rather than a plain import, because typed bindings need your `ac` — and the payoff is that `<Can>` autocompletes actions per resource and rejects the ones that don't exist.

## On the server, skip all of it

A server component already has an ability, so it needs no provider, no context and no client boundary:

```tsx
import { Can } from "@vetojs/react/server";

const ability = await getAbility();

<Can ability={ability} I="update" a="post" this={post} fallback={<ReadOnly />}>
	<EditForm post={post} />
</Can>
```

No directive, no hooks, no factory — the resource map is inferred from the ability you pass. Both branches are decided while rendering, so neither reaches the browser.

## Use them

```tsx
<AbilityProvider rules={rules}>
	<App />
</AbilityProvider>
```

`rules` is the plain array from `ability.rules` — exactly what the server sends. Pass a prebuilt `ability` instead if you already have one; the two props are mutually exclusive.

```tsx
<Can I="update" a="post" this={post} fallback={<DisabledButton />}>
	<EditButton />
</Can>
```

Reads as a sentence: *I* may **update** *a* **post**, this one. Drop `this` when there is no row yet — for a "New post" button the question is whether the action is possible at all.

```tsx
const ability = useAbility();

const visible = posts.filter((post) => ability.can("read", "post", post));
const writable = ability.permittedFields("update", "post", ["title", "status"]);
```

`useAbility` returns the full ability, so every check is available. Called outside a provider it throws rather than silently behaving as if nothing is permitted.

For a single yes-or-no, `useCan` subscribes to that one verdict and re-renders only when it flips — on a list of 50 gated rows where one verdict changes, `useAbility` wakes all 50 and `useCan` wakes 1. `<Can>` uses it internally.

```tsx
const canEdit = useCan("update", "post", post);
```

## Switching actors

Handing the provider new `rules` works, but the prop lives in an ancestor's state, so the switch re-renders that ancestor and everything under it. `useSetRules` writes straight to the store instead:

```tsx
const setRules = useSetRules();

const onSwitchActor = async (id: string) => {
	setRules(await fetchRulesFor(id));
};
```

Nothing above re-renders, and only the rows whose verdict moved update. Use the `rules` prop to seed from the server, `useSetRules` for changes without a new request.

## Hiding is not protecting

A hidden button is a courtesy to the user, not a security boundary — the request it would have sent can still be made by hand. Every action still needs its check on the server. The value of sharing one array of rules is that both sides read the same source, so the UI can't drift out of step with what the server allows.

## Documentation

- **[Full guide](https://github.com/ivan-yuldashev/veto/blob/main/docs/react.md)** — provider, `<Can>`, `useAbility`, and using it with React Server Components.
- **[Project README](https://github.com/ivan-yuldashev/veto#readme)** — what `@vetojs` is and how the engine works.

## License

MIT
