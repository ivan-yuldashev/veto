---
"@vetojs/core": patch
"@vetojs/react": patch
---

**The npm descriptions say what each package does.**

`@vetojs/core` no longer claims to compile SQL by itself — the rules become a `WHERE` clause through the Drizzle adapter — and now names what it does do on its own: answer `can()`, gate writes field by field, and guard a server action, an HTTP handler or an agent tool call.

`@vetojs/react` names the server `<Can>`, which decides while rendering with no client boundary and no hooks.
