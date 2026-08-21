---
"@vetojs/core": minor
---

**A refusal now says where it happened.**

`ability.validate` keeps the path the schema blamed, instead of handing you a message with no field attached:

```ts
const result = ability.validate("post", input);
// { ok: false, issues: [{ message: "expected string", path: ["authorId"] }] }
```

`path` follows Standard Schema, so nested fields arrive as `["meta", "views"]` and array indices as `["tags", 0]`. It is absent when the schema blamed the value as a whole.

**Two refusals that never reached the rules are now visible.**

When `load` comes back with nothing — a `findFirst` that matched nothing, an id belonging to someone else — the guard's decision carries `reason: "no row"`, which reads differently in a log from a policy saying no. When nobody is signed in there is no actor, so no policy and no decision; `onUnauthenticated` now receives `{ action, resource }`, making it the place to record an attempt without a session:

```ts
onUnauthenticated: ({ action, resource }) => {
	log.warn({ action, resource, outcome: "no session" });
	throw new Response(null, { status: 401 });
},
```

**`load` may say it found nothing.** Its return type accepts `null` and `undefined`, so a loader that returns `Post | undefined` no longer needs a cast. `ctx.row` stays a row rather than a maybe-row: reaching your handler is proof one was found.

An empty `violations` array is documented for what it is — a write refused as a whole, with no field left to name — rather than looking like an absence of problems.
