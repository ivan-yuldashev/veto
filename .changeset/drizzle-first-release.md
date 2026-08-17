---
"@vetojs/drizzle": minor
---

**First release.** `@vetojs/drizzle` turns a policy into a Drizzle `WHERE`, so a list query returns exactly the rows `can()` would allow — no re-checking in JavaScript, no rows leaking through.

```ts
const schema = defineTables(ac, { post: posts, user: users, comment: comments });

const rows = await db.select().from(posts)
	.where(schema.filter(ability, "read", "post"));
```

Joins for relations are derived from the foreign keys already declared in your schema, and relations compile to `EXISTS` subqueries, so `author.role` and `comments.some.spam` behave the same in SQL as in memory.

Every leaf predicate is two-valued, so a `deny` group stays correct under negation where a naive translation would not: `NOT (amount > 1000)` against a `NULL` would drop a row the engine allows, and a coerced `'5000' > 1000` would show one it denies. Rules with no honest two-valued form — an unrecognised operator, a quantifier that isn't `some` / `every` / `none`, a missing column — throw while the query is built, so nothing runs.

Postgres only for now. Requires `@vetojs/core` and `drizzle-orm` as peers.
