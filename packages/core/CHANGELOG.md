# @vetojs/core

## 0.1.0

### Minor Changes

- 355ca26: First public release.

  `@vetojs/core` — the engine: `defineAbilities`, `createRules`, `buildAbility`, `parseRules`, ten condition operators, relations with a loaded-relation contract, the write gate (`canMutate` / `validatePayload` / `permittedFields`), and `where()` for compiling a policy into a database filter. Zero runtime dependencies.

  `@vetojs/react` — `createVetoContext(ac)` returning `<Can>`, `useAbility` and `AbilityProvider`, typed per resource.
