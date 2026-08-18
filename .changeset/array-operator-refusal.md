---
"@vetojs/drizzle": patch
---

**An array operator given a non-array value now says where such a rule comes from.**

`has`, `hasAny`, `hasAll`, `in` and `nin` all need an array in the rule. The refusal is the same in every case and now carries the same sentence: `parseRules` rejects such a rule, so one that reaches the compiler was built by hand.
