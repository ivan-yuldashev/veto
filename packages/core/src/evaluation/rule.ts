import type { Rule } from "../model/index.js";
import { isPlainObject, MANAGE_ACTION, RuleEffect } from "../shared/index.js";
import { evaluateCondition } from "./condition.js";
import type { Verdict } from "./verdict.js";

const actionMatches = (
	ruleAction: string | string[],
	action: string,
): boolean => {
	if (Array.isArray(ruleAction)) {
		return ruleAction.includes(MANAGE_ACTION) || ruleAction.includes(action);
	}

	return ruleAction === MANAGE_ACTION || ruleAction === action;
};

/**
 * Does this rule apply to the given action and resource, ignoring its `where`?
 *
 * Exported for adapters and guards that need to inspect a policy without evaluating it.
 */
export const ruleMatches = <T extends Record<string, unknown>>(
	rule: Rule<T>,
	action: string,
	resource: string,
): boolean => {
	return rule.resource === resource && actionMatches(rule.action, action);
};

export const ruleWhereVerdict = <T extends Record<string, unknown>>(
	rule: Rule<T>,
	action: string,
	resource: string,
	instance: T,
): Verdict => {
	if (!ruleMatches(rule, action, resource)) {
		return false;
	}

	return rule.where === undefined
		? true
		: evaluateCondition(rule.where, instance);
};

export const evaluateRules = <T extends Record<string, unknown>>(
	rules: Rule<T>[],
	action: string,
	resource: string,
	instance: unknown,
): boolean => {
	let allowed = false;

	if (!isPlainObject<T>(instance)) {
		return allowed;
	}

	for (const rule of rules) {
		if (allowed && rule.effect !== "deny") {
			continue;
		}

		const verdict = ruleWhereVerdict(rule, action, resource, instance);
		const isDeny = rule.effect === RuleEffect.Deny;

		if (isDeny && verdict !== false) {
			return false;
		}

		if (!isDeny && verdict === true) {
			allowed = true;
		}
	}

	return allowed;
};

export const mightAllow = <T extends Record<string, unknown>>(
	rules: Rule<T>[],
	action: string,
	resource: string,
): boolean => {
	let hasAllow = false;

	for (const rule of rules) {
		if (!ruleMatches(rule, action, resource)) {
			continue;
		}

		if (rule.effect === RuleEffect.Deny && rule.where === undefined) {
			return false;
		}

		if (rule.effect !== RuleEffect.Deny) {
			hasAllow = true;
		}
	}

	return hasAllow;
};
