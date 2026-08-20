---
"@vetojs/core": minor
---

**A payload decision now tells the hook which field it refused.**

`onDecision` reported a payload refusal as `allowed: false` and nothing more, so a log could not tell an attempted field substitution from an ordinary denial. The report now carries the same `violations` the call returns:

```json
{
  "action": "update",
  "resource": "post",
  "allowed": false,
  "violations": [{ "field": "authorId", "reason": "field not permitted" }]
}
```

`field not permitted` says someone wrote a field they do not own; `value not permitted` says the field was theirs and the value was not. Decisions about rows carry no `violations`, because a refusal there is settled by a rule rather than field by field.
