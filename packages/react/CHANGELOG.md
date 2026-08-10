# @vetojs/react

## 0.1.2

### Patch Changes

- Updated dependencies [23e9272]
  - @vetojs/core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [6e5c998]
- Updated dependencies [f303ea8]
  - @vetojs/core@0.2.0

## 0.1.0

### Minor Changes

- 355ca26: First public release.

  `@vetojs/core` — the engine: `defineAbilities`, `createRules`, `buildAbility`, `parseRules`, ten condition operators, relations with a loaded-relation contract, the write gate (`canMutate` / `validatePayload` / `permittedFields`), and `where()` for compiling a policy into a database filter. Zero runtime dependencies.

  `@vetojs/react` — `createVetoContext(ac)` returning `<Can>`, `useAbility` and `AbilityProvider`, typed per resource.

### Patch Changes

- Updated dependencies [355ca26]
  - @vetojs/core@0.1.0
