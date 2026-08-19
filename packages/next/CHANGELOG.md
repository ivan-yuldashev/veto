# @vetojs/next

## 0.2.0

### Minor Changes

- a8c2bba: **`ctx.row` and `ctx.payload` are optional only when the action left them out.**

  Give the action a `load` and the handler gets a row, not a row-or-`undefined`:

  ```ts
  const publish = withPermission(
    { action: "publish", resource: "post", load: (id: string) => loadPost(id) },
    async (ctx) => ctx.row.title
  );
  ```

  `ctx.payload` narrows the same way from `payload`. An action with neither keeps `undefined` in the type, because that is what the handler receives.

- a8c2bba: **The guard is now `@vetojs/core/guard`, and it is not tied to Next.js.**

  ```ts
  import { createGuard } from "@vetojs/core/guard";

  export const withPermission = createGuard({
    ac,
    getActor,
    policy: policyFor,
  });
  ```

  The same wrapper guards a server action, a Hono or Express handler, and an MCP tool call — see [the guard](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/guard.md), [HTTP handlers](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/http.md) and [agents](https://github.com/ivan-yuldashev/vetojs/blob/main/docs/agents.md).

  `@vetojs/next` re-exports `createGuard` from its new home and is no longer maintained; move the import when convenient.

  `@vetojs/core/internal` is gone. It carried the pieces `@vetojs/next` needed to build the guard, which core now does itself.

## 0.1.0

### Minor Changes

- 047d73b: First release. `createGuard` wraps a server action or route handler so the actor, the row and the payload are all checked before your handler runs.

  ```ts
  export const withPermission = createGuard({
    ac,
    getActor,
    policy: policyFor,
  });

  export const updatePost = withPermission(
    {
      action: "update",
      resource: "post",
      load: (formData) => loadPost(formData.get("id")),
      payload: (formData) => ({ title: String(formData.get("title")) }),
    },
    async (ctx, formData) => {
      await db.update(posts).set(ctx.payload).where(eq(posts.id, ctx.row.id));
    }
  );
  ```

  Arguments pass through untouched, so `useActionState` actions — which receive `(previousState, formData)` — and route handlers taking `(request, context)` need no adapter. `ctx.payload` is the validated copy, so a field the actor may not write cannot reach your database call by accident. A refusal throws `ForbiddenError`, or goes to `onDeny` / `onUnauthenticated` if you would rather answer with `notFound()`, `redirect()` or a 401.

  The package imports neither `next` nor `react`; `@vetojs/core` is a peer dependency.
