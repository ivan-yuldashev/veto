/** One rejected field from a payload check: which key, and why. */
export type Violation = { field: string; reason: string };

const marker = Symbol.for("veto.ForbiddenError");

/**
 * Thrown by `ability.authorize` and by the guards when an action is refused.
 *
 * Carries what was refused, and — for payload failures — which fields and why.
 */
export class ForbiddenError extends Error {
	readonly [marker] = true;
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

	/**
	 * Whether this refusal came from veto — prefer it over `instanceof`.
	 *
	 * Two copies of `@vetojs/core` in one tree give the error two class identities, and
	 * `instanceof` then answers `false` for a perfectly valid refusal: the 403 quietly
	 * becomes a 500. The brand is a registered symbol, so it survives that.
	 */
	static is(error: unknown): error is ForbiddenError {
		return typeof error === "object" && error !== null && marker in error;
	}
}
