---
"@vetojs/core": minor
---

**Every decision can now be recorded, with the rule that settled it.**

```ts
const ability = buildAbility(ac, policyFor(currentUser), {
	onDecision: (decision) => {
		log.info({ actor: currentUser.id, ...decision });
	},
});
```

The report carries the `action`, the `resource`, whether it was `allowed`, and the `rule` that decided — the `deny` that fired or the `allow` that granted. There is no `rule` when nothing matched and the default denied, which is the case worth alerting on: the policy said nothing about a question someone asked.

A payload decision carries no `rule` — a refusal there is per field, and the `violations` you get back name the field and the reason. It fires for `can`, `cannot`, `authorize`, `canMutate` and `validatePayload`, once per call, and not for `where`, `permittedFields` or `validate` — those ask what a policy says rather than whether an actor may act. The verdict is decided before the hook runs, so nothing it does can change an answer; whatever it throws reaches your caller untouched.

`createGuard` takes the same hook with the actor as a second argument, because it is configured once while the actor is resolved per call.

The rule is recorded where it fires, so a decision with a hook costs 4-8% more than one without and a decision without a hook costs what it always did. The browser bundle grows by 130 bytes gzipped.
