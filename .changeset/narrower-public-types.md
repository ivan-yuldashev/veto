---
"@vetojs/core": minor
---

**Two types are no longer exported: `RelationNode` and `CheckedRule`.**

Neither was reachable in practice. `RelationNode` named one of the five shapes `ConditionNode` can take, and the other four were never exported — even the Drizzle adapter narrows with `Extract<ConditionNode<…>, { relation: string }>` rather than naming it. `CheckedRule` is the singular of `CheckedRules`, which stays.

Nothing changes in what you can write: `allow()` and `deny()` return the same values, conditions have the same shape, and both types are still inferred wherever they appear. If you named one explicitly, use `Extract<ConditionNode<T>, { relation: string }>` or `CheckedRules[number]`.
