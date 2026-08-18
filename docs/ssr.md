# Server rendering, and the static trap

**[English](ssr.md) · [Русский](ssr.ru.md)**

Rules are plain JSON, so they cross from server to client in whatever a framework already uses to ship data — RSC payload, `load` return, page props. Nuxt, SvelteKit, Astro, Remix and Next all do the same thing here, and none of them needs an adapter.

```tsx
const ability = buildAbility(ac, policyFor(currentUser));

<AbilityProvider rules={ability.rules}>
	<Toolbar post={post} />
</AbilityProvider>
```

`ability.rules` is the array that was built on the server. The client rebuilds an ability from it and asks the same questions — no second policy, no endpoint to fetch permissions from.

## Where the rules cross

**Next, App Router.** A server component builds the ability and renders the provider; the rules ride the RSC payload. Two details cost people an afternoon: `cookies()` is async, so the actor is awaited, and the module calling `createVetoContext` is a client module — the provider holds state, and state lives on the client.

```ts
"use client";

export const { AbilityProvider, useAbility } = createVetoContext(ac);
```

**SvelteKit.** `locals.user` is set in `hooks.server.ts`, and only a `.server.ts` load may read it. Return the rules from `+layout.server.ts` and every child route has them in `data`:

```ts
export const load = ({ locals }: { locals: { user: { id: string } } }) => ({
	rules: policyFor(locals.user),
});
```

**React Router, formerly Remix.** The same thing one file over: a `loader` returns the rules, `useLoaderData()` reads them in the component.

**Nuxt.** Server middleware puts the actor on `event.context`; a route middleware seeds `useState("rules", …)` from `useNuxtApp().ssrContext`, and Nuxt serialises that payload for hydration.

**Astro.** Middleware sets `Astro.locals.user`, the page reads it and passes the rules to the island as props. Island props must be serialisable — rules are, which is the whole point.

## What crosses, and what does not

**Send the rules.** They are already scoped to one actor: a policy function turns the actor into the rules that apply to them, so what reaches the browser is the subset that actor is governed by.

**Do not send the actor's source of truth.** The rules are the interface; the session, the memberships table and the claims that produced them stay on the server.

**Treat the rules as visible.** They describe what the actor may do, which is fair for them to know, but write them as if a curious user will read them — because one will. A rule that leaks a workspace id they cannot otherwise see is a leak whether or not the UI shows it.

## The static trap

**A statically generated page has no actor.** At build time there is nobody signed in, so a verdict baked into the HTML is a verdict about nobody — and the moment it is cached at a CDN it becomes a verdict about everybody.

That gives two honest options:

**Render the page without gating, then gate after hydration.** The static shell shows what any visitor may see; the client fetches rules and reveals the rest. The gap is visible — a flash of ungated UI — so keep the static shell to what is genuinely public.

**Gate at the edge.** A middleware or edge function that knows the request has an actor, builds the ability there and redirects or rewrites. That is server rendering again, just closer to the user.

What is never an option is baking the rules of one user into a page others will receive. If a page is cached, the rules in it are cached too.

## The server has to check anyway

Hiding a control is UX. The request it hides can still be sent by hand, so the server does the real check every time:

```ts
if (ability.cannot("update", "post", post)) {
	notFound();
}
```

This holds identically for a server component, a `+page.server.ts`, a loader and a route handler. See [the guard](./guard.md) for the wrapper that does it once per action, and [checking access](./ability.md) for the difference between asking with a row and without one.

## Why it works this way

- **Rules are data, not an object.** That is what lets them cross a serialization boundary at all — a class instance would not survive it, which is the concrete reason this library is not built on one.
- **The same array on both sides.** The client cannot drift from the server, because there is nothing to drift: one array, built once, read in two places.
- **Building is per request.** An ability is closures over one actor's rules; caching one across requests is how a user ends up with someone else's permissions.

## Source

[`api/ability.ts`](../packages/core/src/api/ability.ts) · [React bindings](./react.md) · [the guard](./guard.md)
