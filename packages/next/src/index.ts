/**
 * @deprecated Moved to `@vetojs/core/guard`, which serves HTTP handlers and agent tool
 * calls as well. Change the import and drop this package; the API is identical.
 *
 * @example
 * import { createGuard } from "@vetojs/core/guard";
 */
export {
	type ActionOptions,
	type Awaitable,
	createGuard,
	type GuardConfig,
	type GuardContext,
	type WithPermission,
} from "@vetojs/core/guard";
