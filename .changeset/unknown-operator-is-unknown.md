---
"@vetojs/core": patch
---

**An operator the engine does not recognise now answers `undefined` instead of `false`.** `false` read the same in both effects: an `allow` granted nothing, but a `deny` also did nothing — so an unrecognised operator inside a `deny` handed back a row the rule was written to hide.

```ts
deny("read", "post", { where: { field: "secret", op: "bogus", value: true } })
```

The row used to pass. It is now hidden, matching how the engine already answers a relation quantifier it does not recognise: unknown grants nothing and denies everything it touches.

`parseRules` rejects an unrecognised operator, so this only reaches the engine when rules are cast past the gate — the same reach as the quantifier fix in 0.5.1, and the same patch-sized blast radius.
