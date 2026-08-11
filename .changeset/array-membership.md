---
"@vetojs/core": minor
---

**Added `has` / `hasAny` / `hasAll` for array fields.**

```ts
allow("read", "doc", { where: { tags: { has: "urgent" } } });
allow("read", "doc", { where: { roles: { hasAny: ["admin", "owner"] } } });
allow("read", "doc", { where: { roles: { hasAll: ["billing", "support"] } } });
```

Until now an array field had no usable operator: `eq` and `in` compared the array as a whole, which is never equal by reference, so such a rule answered unknown for every row — granting nothing and firing every `deny`. A `roles: string[]` column had no way to ask the obvious question.

An absent field is a decidable miss. A present non-array answers unknown, so a wrong shape cannot decide in either direction. An empty `hasAll` is satisfied by any array, but not by an absent field.

**Breaking at compile time: a field is offered only the operators that can answer something about it.**

An array of scalars takes `has` / `hasAny` / `hasAll` and `exists`. Anything non-scalar — a nested object, an array of objects — takes only `exists`; model it as a relation if you need to match inside it.

What stops compiling is `eq` on an object field and `eq` or `in` on an array. Those rules answered unknown for every row, so no working policy changes. Runtime behaviour is untouched, including scalars, `Date` and the `number` / `bigint` bridge.
