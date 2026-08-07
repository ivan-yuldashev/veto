import type { Violation } from "../errors/index.js";

/** Public name for a payload violation; the shape ForbiddenError also carries. */
export type PayloadViolation = Violation;

export type PayloadResult<T> =
	| { ok: true; data: Partial<T> }
	| { ok: false; violations: PayloadViolation[] };
