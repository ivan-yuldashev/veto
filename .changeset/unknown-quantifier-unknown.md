---
"@vetojs/core": patch
---

**A relation quantifier the engine does not recognise is now unknown, not a miss.**

A to-many condition whose `match` is something other than `some`, `every` or
`none` used to answer "no match". An `allow` written that way granted nothing,
which was right, but a `deny` written that way went silent — the prohibition
never fired and the row stayed visible. It now answers unknown, so the `allow`
still grants nothing and the `deny` fires, in line with every other shape the
engine cannot decide.

Rules built with `createRules` cannot carry such a quantifier, and `parseRules`
rejects one, so this only reaches the engine when rules are cast past both
gates. If yours are, a `deny` you thought was doing nothing may now start
refusing rows.
