import type { ConditionNode } from "../model/index.js";
import {
	ConditionOperator,
	isPlainObject,
	MATCH_QUANTIFIERS,
	type MatchQuantifier,
	RelationKind,
} from "../shared/index.js";
import {
	asOperator,
	combineNodes,
	normalizeConditionValue,
} from "./condition-shorthand.js";
import type { Relation, ResourceMap } from "./define-abilities.js";

type Node = ConditionNode<Record<string, unknown>>;

const relationsOf = (
	ac: ResourceMap,
	resource: string,
): Record<string, Relation> => ac[resource]?.relations ?? {};

const nothing = (): Node => ({ or: [] });

const isMatchQuantifier = (match: string): match is MatchQuantifier => {
	return MATCH_QUANTIFIERS.includes(match);
};

const quantifierNode = (
	relation: string,
	match: string,
	nested: unknown,
	ac: ResourceMap,
	resource: string,
): Node => {
	if (!isMatchQuantifier(match) || !isPlainObject(nested)) {
		return nothing();
	}

	return {
		relation,
		type: "many",
		match,
		where: compileWhereInput(nested, ac, resource),
	};
};

const relationNodes = (
	key: string,
	relation: Relation,
	value: unknown,
	ac: ResourceMap,
): Node[] => {
	if (relation.kind === RelationKind.One) {
		return [
			{
				relation: key,
				type: "one",
				where: compileWhereInput(value, ac, relation.resource),
			},
		];
	}

	if (!isPlainObject(value)) {
		return [nothing()];
	}

	return Object.entries(value)
		.filter(([, nested]) => nested !== undefined)
		.map(([match, nested]) =>
			quantifierNode(key, match, nested, ac, relation.resource),
		);
};

export const compileWhereInput = (
	shorthand: unknown,
	ac: ResourceMap,
	resource: string,
): Node => {
	if (!isPlainObject(shorthand)) {
		return nothing();
	}

	const relations = relationsOf(ac, resource);
	const nodes: Node[] = [];

	for (const [key, value] of Object.entries(shorthand)) {
		if (value === undefined) {
			continue;
		}

		if (key === "and" || key === "or") {
			if (!Array.isArray(value)) {
				nodes.push(nothing());
				continue;
			}

			const children = value.map((child) =>
				compileWhereInput(child, ac, resource),
			);

			nodes.push(key === "and" ? { and: children } : { or: children });

			continue;
		}

		if (key === "not") {
			nodes.push(
				isPlainObject(value)
					? { not: compileWhereInput(value, ac, resource) }
					: nothing(),
			);

			continue;
		}

		const relation = relations[key];

		if (relation !== undefined) {
			nodes.push(...relationNodes(key, relation, value, ac));

			continue;
		}

		const operator = asOperator(value);

		nodes.push(
			operator
				? { field: key, op: operator.op, value: operator.value }
				: {
						field: key,
						op: ConditionOperator.Equal,
						value: normalizeConditionValue(value),
					},
		);
	}

	return combineNodes(nodes);
};
