# Documentation

**[English](README.md) · [Русский](README.ru.md)**

One page per concept, each describing how the shipped code actually behaves. Start with the [project README](../README.md) if you haven't met the library yet.

> The source carries no comments by project convention — the reasoning lives here instead. Every page ends with a "why it works this way" section.

## Generating code with an assistant

- **[For agents](./for-agents.md)** — the whole API in one page, correct idioms, and the mistakes that look plausible.

## Getting a policy running

1. **[Declaring resources](./define-abilities.md)** — `defineAbilities`: what exists and what can be done to it. Everything else infers from here.
2. **[What a rule is](./rules.md)** — the data model, and the `where` / `payload` split.
3. **[Writing policies](./create-rules.md)** — `createRules`: typed `allow` / `deny` factories.
4. **[Checking access](./ability.md)** — `buildAbility`: `can`, `authorize`, `permittedFields`, `validate`.

## Conditions

- **[Conditions](./conditions.md)** — the tree behind `where`, and what "unknown" means.
- **[Field shorthand](./condition-shorthand.md)** — how `{ views: { gt: 100 } }` is written and stored.
- **[Operators](./operators.md)** — all ten, including the edge cases that matter for safety.
- **[Relations](./relations.md)** — conditions across related resources, and the loaded-relation contract.

## Enforcement

- **[How a decision is made](./rule-evaluation.md)** — deny-override, default-deny, and fail-closed behaviour.
- **[Writes](./mutations.md)** — which fields and which values may be written.
- **[Filtering in the database](./where.md)** — the same rules as a SQL `WHERE`, with the guarantee that it matches `can()`.
- **[Rules from outside](./parse.md)** — `parseRules`: validating untrusted rule JSON at the trust boundary.

## Using it in an app

- **[`@vetojs/react`](./react.md)** — `<Can>`, `useAbility`, `AbilityProvider`: the same rules in the UI.

A Next.js guard and a Drizzle adapter turning `ability.where()` into SQL are in progress; their docs land with the packages.
