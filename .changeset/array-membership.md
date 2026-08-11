---
"@vetojs/core": minor
---

**Added `has` / `hasAny` / `hasAll` for array fields.**

```ts
allow("read", "doc", { where: { tags: { has: "urgent" } } });
allow("read", "doc", { where: { roles: { hasAny: ["admin", "owner"] } } });
allow("read", "doc", { where: { roles: { hasAll: ["billing", "support"] } } });
```

An array field previously had exactly one operator that could decide anything — `exists`. `eq` and `in` compiled but compared the array as a whole, which is never equal by reference, so the rule could only ever answer unknown: it granted nothing and fired every `deny` regardless of the row. A `roles: string[]` column had no way to ask the obvious question.

`hasAny` and `hasAll` are conveniences over `or` and `and` around `has`; Postgres answers each with a single indexable operator, so they cost nothing there either.

A value where a scalar is expected — `has: ["a"]` — answers unknown rather than being read as `hasAny`, and `hasAny` / `hasAll` need a list just as `in` and `nin` do. An absent field is a decidable miss. A present non-array answers unknown, so neither polarity can decide on the wrong shape. An empty `hasAll` asks nothing of the elements, so any array satisfies it — an absent field still does not.

**Changed: fields now offer only the operators that can decide something about them.**

An array-of-scalars field takes `has` / `hasAny` / `hasAll` / `exists`. Anything non-scalar — a nested object, an array of objects — takes only `exists`; model it as a relation if you need to match inside it.

This is a compile-time narrowing of `where` and `payload.constraints`. Rules that stop compiling were rules that could never decide anything: `{ meta: { eq: { lang: "ru" } } }` and `{ tags: { eq: [...] } }` both answered unknown for every row. Runtime behaviour is unchanged for them, and unchanged everywhere else — scalars, `Date` and the `number` / `bigint` bridge are untouched.
