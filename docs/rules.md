# What a rule is

**[English](rules.md) · [Русский](rules.ru.md)**

A rule is one sentence of policy: *allow (or deny) this action on this resource, for these rows, over these fields.* Rules are plain JSON objects — that is the central design choice of the library. They serialise, travel from server to client, get stored in a database, and are edited by a UI without ever becoming code.

A policy is then just a function:

```ts
const policyFor = (actor: User): CheckedRules => [
	allow("read", "post", { where: { status: "published" } }),
	allow(["update", "publish"], "post", { where: { authorId: actor.id } }),
	deny("update", "post", { payload: { fields: ["featured"] } }),
];
```

No class, no builder, no hidden state — a pure function from actor to data.

## The shape

```ts
type Rule<T = Record<string, unknown>> = {
	effect: "allow" | "deny";
	action: string | string[];
	resource: string;
	where?: ConditionNode<T>;
	payload?: {
		fields?: (keyof T)[];
		constraints?: FieldConditionNode<Partial<T>>;
	};
};
```

| Field | Meaning |
|---|---|
| `effect` | `allow` or `deny`. A deny always wins — see [rule evaluation](./rule-evaluation.md) |
| `action` | one action, several, or `"manage"` for all of them |
| `resource` | which resource this is about |
| `where` | **which rows** the action may touch |
| `payload.fields` | **which fields** may be written |
| `payload.constraints` | **which values** those fields may take |

## `where` and `payload` answer different questions

This split is the thing to internalise:

- `where` — *may I touch this row at all?* Checked against the row as it exists in the database.
- `payload` — *may I write this?* Checked against the incoming data.

"Bob may edit his own posts" is a `where`. "Bob may edit the title but never the `featured` flag" is `payload.fields`. "Bob may set status, but only to `draft`" is `payload.constraints`. Conflating them produces rules that look right and enforce the wrong thing — [mutations](./mutations.md) walks through the combinations.

## Rules as data

Because a rule is JSON, it survives a round trip:

```ts
const wire = JSON.stringify(policyFor(actor));
const parsed = parseRules(JSON.parse(wire), ac); // validated at the boundary
```

Values inside rules stay JSON-native — a `Date` is stored as epoch milliseconds by the shorthand compiler, so nothing is lost in transit. See [parse](./parse.md) for what happens to untrusted rule JSON, and [condition shorthand](./condition-shorthand.md) for how values are encoded.

## Why it works this way

- **`where` and `payload` are separate fields, not one merged condition.** The structure itself prevents writing a row-constraint where a value-constraint was meant.
- **`payload.constraints` is typed over a partial shape**, because a PATCH sends only the fields it changes. Only the keys actually present in the data are checked.
- **The default type is `Record<string, unknown>`, not `any`.** Rules deserialised from a database stay usable without leaking `any` into your code; a typed `Rule<Post>` narrows `where`, `fields` and `constraints` to the resource.
- **`"manage"` opens to the future.** It grants every action the resource declares *at the moment of the check*, so an action added to `defineAbilities` later is granted to everyone already holding it. That is usually what "this role owns the resource" means. When a grant should be a snapshot of today — a policy transcribed from a list of permissions the backend hands out, where a new action is not granted by the model learning about it — write the list instead:

```ts
allow("manage", "post");            // every action post has, now and later
allow([...ac.post.actions], "post"); // the actions post has today
```

- **`"manage"` is a plain string, not a special type.** Its meaning is given by rule matching, so a policy stored as JSON needs no special encoding.

## Source

[`model/rule.ts`](../packages/core/src/model/rule.ts) · [tests](../packages/core/tests/model/rule.test.ts)
