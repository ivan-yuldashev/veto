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

No directive, no hooks, no factory — the resource map is inferred from the ability you pass, and both branches are decided while rendering, so neither reaches the browser.

**`useCan` — subscribe to one verdict instead of the whole ability.**

```tsx
const canEdit = useCan("update", "post", post);
```

`useAbility` wakes every component holding it whenever the rules change; on a list of 50 gated rows where one verdict flips, that is 50 re-renders for one real change, against 1 with `useCan`. `<Can>` uses it internally, so existing markup gets this without an edit. Keep `useAbility` for anything beyond a yes or no — `permittedFields`, `validate`, filtering a list.

**`useSetRules` — switch actors without re-rendering the page.**

```tsx
const setRules = useSetRules();
setRules(await fetchRulesFor(actorId));
```

Passing new `rules` to the provider re-renders the ancestor holding them and everything beneath it. Use the prop to seed from the server and `useSetRules` for changes without a new request.

**The client `<Can>` also takes an `ability` prop**, ignoring the context when given — useful when a subtree has its own ability, or when you would rather not mount a provider. With neither it throws rather than assuming a policy.

Nothing is removed: `createVetoContext`, `AbilityProvider` and `useAbility` behave exactly as before, and server rendering is unaffected.
