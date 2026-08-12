---
"@vetojs/core": minor
"@vetojs/react": minor
---

`@vetojs/core` is now a peer dependency of `@vetojs/react`, and `ForbiddenError.is()` recognises a refusal without relying on class identity.

`@vetojs/react` used to depend on `@vetojs/core` normally, so upgrading core past the range react was published against installed a second copy rather than reporting a mismatch. Two copies interoperate almost everywhere — rules are plain data — which is what made the one failure quiet: `ForbiddenError` gets two class identities, `error instanceof ForbiddenError` answers `false` for a valid refusal, and a 403 turns into a 500. As a peer dependency the mismatch surfaces at install time instead.

Install core alongside the bindings:

```sh
npm add @vetojs/react @vetojs/core
```

`ForbiddenError.is(error)` matches on a registered symbol, so it also holds where a duplicate copy does slip through:

```ts
try {
	ability.authorize("delete", "post", post);
} catch (error) {
	if (ForbiddenError.is(error)) {
		error.violations;
	}
}
```

`instanceof` still works when there is one copy, and nothing else about the error changed.
