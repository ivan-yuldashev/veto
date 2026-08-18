# `@vetojs/next` — moved

**[English](next.md) · [Русский](next.ru.md)**

> **This package is no longer maintained.** The guard it contained never imported `next` or `react`, so it now lives in the engine as [`@vetojs/core/guard`](./guard.md) and works the same for HTTP handlers and agent tool calls. `@vetojs/next` remains as a re-export so nothing breaks today, and will receive no further changes.

## Moving over

Change the import. Nothing else — the API is identical, and the package you install is one you already have.

```ts
import { createGuard } from "@vetojs/core/guard";
```

Then drop `@vetojs/next` from your dependencies. `@vetojs/core` must be `0.7.0` or newer.

Everything the old page described is on the [guard page](./guard.md), which now also covers HTTP handlers and tool calls.
