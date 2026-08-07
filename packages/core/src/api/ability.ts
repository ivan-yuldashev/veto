import { ForbiddenError } from "../errors/index.js";
import { evaluateRules, mightAllow } from "../evaluation/index.js";
import type { ConditionNode } from "../model/index.js";
import type { AbilitySet } from "./ability.types.js";
import type { CheckedRules } from "./checked-rules.types.js";
import type { ResourceMap } from "./define-abilities.js";
import { canMutate, permittedFields, validatePayload } from "./mutation.js";
import type { PayloadResult } from "./mutation.types.js";
import { validateSchema } from "./schema.js";
import type { ValidateResult } from "./schema.types.js";
import { compileWhere } from "./where.js";

export type { AbilitySet } from "./ability.types.js";

/**
 * Turns a policy into the object you call.
 *
 * Accepts only rules that provably passed a check — from {@link createRules} (verified by
 * the compiler) or {@link parseRules} with a vocabulary (verified at runtime), so the
 * validation step for rules arriving from a database or the network cannot be skipped.
 *
 * @param registry - your {@link defineAbilities} declarations
 * @param rules - the policy for one actor
 *
 * @example
 * const ability = buildAbility(ac, policyFor(user));
 * ability.can("update", "post", post);
 */
export const buildAbility = <AC extends ResourceMap = ResourceMap>(
	registry: AC,
	rules: CheckedRules,
): AbilitySet<AC> => {
	// One decision, three ways to report it: a boolean, its negation, or an exception.
	// With an instance the answer is exact; without one it is the optimistic check.
	const decide = (
		action: string,
		resource: string,
		instance?: unknown,
	): boolean =>
		instance === undefined
			? mightAllow(rules, action, resource)
			: evaluateRules(rules, action, resource, instance);

	const core = {
		rules,
		can: decide,
		cannot: (action: string, resource: string, instance?: unknown): boolean =>
			!decide(action, resource, instance),
		authorize: (action: string, resource: string, instance?: unknown): void => {
			if (!decide(action, resource, instance)) {
				throw new ForbiddenError(action, resource);
			}
		},
		canMutate: (action: string, resource: string, row: unknown): boolean =>
			canMutate(rules, action, resource, row),
		validatePayload: (
			action: string,
			resource: string,
			row: unknown,
			data: unknown,
		): PayloadResult<Record<string, unknown>> =>
			validatePayload(rules, action, resource, row, data),
		where: (
			action: string,
			resource: string,
		): ConditionNode<Record<string, unknown>> =>
			compileWhere(rules, action, resource),
		permittedFields: (
			action: string,
			resource: string,
			fields: string[],
		): string[] => permittedFields(rules, action, resource, fields),
		validate: (
			resource: string,
			data: unknown,
		): ValidateResult<Record<string, unknown>> => {
			const definition = registry[resource];
			return definition === undefined
				? {
						ok: false,
						issues: [{ message: `unknown resource "${resource}"` }],
					}
				: validateSchema(definition.schema, data);
		},
	};

	return core as AbilitySet<AC>;
};
