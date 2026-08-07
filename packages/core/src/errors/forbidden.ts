/** One rejected field from a payload check: which key, and why. */
export type Violation = { field: string; reason: string };

/**
 * Thrown by `ability.authorize` and by the guards when an action is refused.
 *
 * Carries what was refused, and — for payload failures — which fields and why.
 */
export class ForbiddenError extends Error {
	readonly action: string;
	readonly resource: string;
	readonly violations?: Violation[];

	constructor(action: string, resource: string, violations?: Violation[]) {
		super(`Forbidden: cannot "${action}" on "${resource}".`);
		this.name = "ForbiddenError";
		this.action = action;
		this.resource = resource;
		if (violations !== undefined) {
			this.violations = violations;
		}
	}
}
