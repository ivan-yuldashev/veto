---
"@vetojs/core": minor
"@vetojs/next": minor
---

**The guard is now `@vetojs/core/guard`, and it is not tied to Next.js.**

```ts
import { createGuard } from "@vetojs/core/guard";

export const withPermission = createGuard({ ac, getActor, policy: policyFor });
```

The same wrapper guards a server action, a Hono or Express handler, and an MCP tool call — see [the guard](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/guard.md), [HTTP handlers](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/http.md) and [agents](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/agents.md).

`@vetojs/next` re-exports `createGuard` from its new home and is no longer maintained; move the import when convenient.

`@vetojs/core/internal` is gone. It carried the pieces `@vetojs/next` needed to build the guard, which core now does itself.
