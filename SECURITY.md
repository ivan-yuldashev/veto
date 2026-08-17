# Security Policy

`@vetojs` decides who may read and write what. A bug here is a security bug, so please report it privately rather than opening a public issue.

## Reporting a vulnerability

Use GitHub's [private vulnerability reporting](https://github.com/ivan-yuldashev/vetojs/security/advisories/new) — it opens a draft advisory visible only to the maintainers.

Please include the affected package and version, a minimal policy and data that reproduce the problem, and what you expected to happen instead. A failing test case is the fastest possible report.

You can expect an initial reply within a few days. If a fix is warranted, we will prepare it together with an advisory and credit you unless you prefer otherwise.

## What counts as a vulnerability

Anything that widens access beyond what the policy states, in particular:

- a check that returns `true` where the rules say it should not;
- a `deny` rule that stops applying — because of malformed data, an unusual type, or a crafted payload;
- a database filter from `ability.where` selecting rows that `can()` would refuse (the two must agree exactly);
- the trust boundary letting through rules it should have rejected or quarantined — see [`parseRules`](./docs/parse.md);
- prototype pollution or anything else that lets untrusted rule JSON influence evaluation beyond its own rule.

## What doesn't

- **A hidden UI element that can still be reached by calling the API.** Hiding is a courtesy; the server check is the control. See [`@vetojs/react`](./docs/react.md).
- **`RelationNotLoadedError` being thrown.** That is the intended behaviour when a rule needs a relation you did not load — failing loudly instead of guessing.
- **A policy that grants more than its author intended.** If the rules say it, the engine enforces it.
- **Denial on malformed data.** The engine fails closed by design; a wrong-typed value narrowing access is correct, not a bug.

## Supported versions

While the project is pre-1.0, fixes go to the latest minor release.
