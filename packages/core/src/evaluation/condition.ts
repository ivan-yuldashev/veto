import { RelationNotLoadedError } from "../errors/index.js";
import type { ConditionNode } from "../model/index.js";
import {
	FOREIGN_KEY_TYPES,
	isPlainObject,
	MatchQuantifier,
	RelationKind,
} from "../shared/index.js";
import { isLoaded } from "./loaded.js";
import { evaluateOperator } from "./operator.js";
import {
	kleeneAndOver,
	kleeneNot,
	kleeneOrOver,
	type Verdict,
} from "./verdict.js";

const relationItems = (
	related: unknown,
	relation: string,
): Record<string, unknown>[] | null => {
	if (related === null || related === undefined) {
		return [];
	}

	const raw = Array.isArray(related) ? related : [related];
	const items: Record<string, unknown>[] = [];

	for (const item of raw) {
		if (isPlainObject(item)) {
			items.push(item);
			continue;
		}

		if (FOREIGN_KEY_TYPES.includes(typeof item)) {
			throw new RelationNotLoadedError(relation);
		}

		return null;
	}

	return items;
};

const ownField = (instance: Record<string, unknown>, key: string): unknown => {
	return Object.hasOwn(instance, key) ? instance[key] : undefined;
};

export const evaluateCondition = <T extends Record<string, unknown>>(
	node: ConditionNode<T>,
	instance: T,
): Verdict => {
	if (instance === null || instance === undefined) {
		return false;
	}

	if ("and" in node) {
		return kleeneAndOver(node.and, (child) =>
			evaluateCondition(child, instance),
		);
	}

	if ("or" in node) {
		return kleeneOrOver(node.or, (child) => evaluateCondition(child, instance));
	}

	if ("not" in node) {
		return kleeneNot(evaluateCondition(node.not, instance));
	}

	if ("relation" in node) {
		const related = ownField(instance, node.relation);

		if (related === undefined && !isLoaded(instance, node.relation)) {
			throw new RelationNotLoadedError(node.relation);
		}

		const items = relationItems(related, node.relation);

		if (items === null) {
			return undefined;
		}

		const itemVerdict = (item: Record<string, unknown>): Verdict =>
			evaluateCondition(node.where, item);

		if (node.type === RelationKind.One) {
			const verdict = kleeneOrOver(items, itemVerdict);

			return Array.isArray(related) ? undefined : verdict;
		}

		switch (node.match) {
			case MatchQuantifier.Some:
				return kleeneOrOver(items, itemVerdict);
			case MatchQuantifier.Every:
				return kleeneAndOver(items, itemVerdict);
			case MatchQuantifier.None:
				return kleeneNot(kleeneOrOver(items, itemVerdict));
			default:
				node satisfies never;
				return undefined;
		}
	}

	return evaluateOperator(node.op, ownField(instance, node.field), node.value);
};
