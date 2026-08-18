---
"@vetojs/core": patch
---

**A payload constraint that is not flat now says so.**

`payload.constraints` takes a field condition or an `and` of them. Given an `or`, a `not` or a `relation`, `parseRules` used to report the field it could not find:

```
rules[0].payload.constraints.field: expected a string
```

It now names what it refused:

```
rules[0].payload.constraints: "or" is not allowed in payload constraints — they take a field condition or "and"
```

The rules accepted are unchanged; "this value is forbidden" is still a `deny` rule rather than an expression buried in a constraint.
