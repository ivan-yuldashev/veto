---
"@vetojs/core": minor
---

**`CheckedRule` is exported again.**

`0.7.0` dropped it as unreachable. It is not: a table typed as permission → rule needs the singular, and `CheckedRules[number]` is a workaround for a name that should simply be there — `Rule` is exported and its checked sibling was not.

```ts
const byPermission: Record<string, CheckedRule> = { … };
```
