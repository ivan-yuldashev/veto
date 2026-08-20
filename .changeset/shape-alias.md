---
"@vetojs/core": minor
---

**`shape()` replaces `type()`, which is now deprecated.**

`type` collides with the TypeScript modifier of the same name, so a real import line reads like a typo and import sorters order it differently between runs:

```ts
import { type CheckedRules, createRules, defineAbilities, type } from "@vetojs/core";
```

`shape` is the same function under a name that cannot be confused with syntax:

```ts
import { type CheckedRules, createRules, defineAbilities, shape } from "@vetojs/core";

const ac = defineAbilities({
	resources: { post: { schema: shape<Post>(), actions: ["read"] } },
});
```

`type` stays exported and keeps working; rename whenever it suits you.
