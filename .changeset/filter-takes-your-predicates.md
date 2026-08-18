---
"@vetojs/drizzle": minor
---

**`filter` accepts your own predicates.** The commonest query — this row by id, if the policy allows it — no longer needs composing outside:

```ts
db.select().from(posts).where(schema.filter(ability, "read", "post", eq(posts.id, id)));
```

Anything after the resource is ANDed with the policy, so the call can only narrow the result: a row the policy hides stays hidden however you filter for it. The return stays `SQL`, where composing with Drizzle's own `and` gives `SQL | undefined` and needs an assertion at every call site. Predicates are whatever Drizzle accepts, so a boolean column stands on its own, and several may be passed at once.

The array operators now bind the whole array as one parameter — `labels && $1` rather than `labels && array[$1, $2]`. The rows selected are unchanged; only a test asserting on generated SQL would notice.
