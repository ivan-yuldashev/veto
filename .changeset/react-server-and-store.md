---
"@vetojs/react": minor
---

**`@vetojs/react/server` — gate a server component without turning it into a client one.**

```tsx
import { Can } from "@vetojs/react/server";

const ability = await getAbility();

<Can ability={ability} I="update" a="post" this={post} fallback={<ReadOnly />}>
	<EditForm post={post} />
</Can>
```

`"use client"` marks a whole module, so the provider, `<Can>` and `useAbility` were client-side together. Gating a server component meant hand-rolling a ternary around `ability.can()` or adding a client boundary just to hide a button.

This `Can` carries no directive and calls no hooks. Both branches are decided while rendering, so neither reaches the browser. No factory either: the resource map is inferred from the ability you pass, so an action still cannot be paired with the wrong resource.

**`useCan` — one question, one subscription.**

```tsx
const canEdit = useCan("update", "post", post);
```

`useAbility` hands back the whole object, so every component holding it re-renders whenever the rules change. On a list of 50 gated rows where switching actors flips exactly one verdict, that is 50 re-renders for one real change. `useCan` subscribes through `useSyncExternalStore` and re-renders only when *its* answer changes — 1 instead of 50, measured. `<Can>` uses it internally, so existing markup gets this without any edit.

Reach for `useAbility` when you need more than a yes or no: `permittedFields`, `validate`, filtering many rows at once.

**`useSetRules` — change rules without re-rendering the tree.** Passing new `rules` to the provider goes through React state in an ancestor, so that ancestor re-renders and takes its subtree with it: on the same 50-row list, 101 re-renders for one changed verdict, none of them from `<Can>`. `useSetRules` writes to the store directly — provider 0, ungated rows 0, gated rows 1. Seed with the `rules` prop, switch with `useSetRules`.

The store is created per provider, never as a module singleton — a module-scoped store is shared by every concurrent request on a server and leaks one user's rules into another's render. It also supplies `getServerSnapshot`, without which server rendering throws and React falls back to client rendering, and it publishes from a layout effect so a rules change lands before the browser paints rather than one frame after.

**The client `<Can>` now accepts an `ability` prop.** Pass it and the context is ignored — useful when a subtree has its own ability, or when you would rather not mount a provider. With neither, it throws instead of assuming a policy.

Nothing is removed: `createVetoContext`, `AbilityProvider` and `useAbility` work exactly as before.
