import type { ConditionOperator, MatchQuantifier } from "../shared/index.js";

export type FieldConditionNode<T extends Record<string, unknown>> =
	| FieldNode<T>
	| { and: FieldConditionNode<T>[] };

type ToManyRelationNode = {
	relation: string;
	type: "many";
	match: MatchQuantifier;
	where: ConditionNode<Record<string, unknown>>;
};

type ToOneRelationNode = {
	relation: string;
	type: "one";
	match?: never;
	where: ConditionNode<Record<string, unknown>>;
};

export type RelationNode = ToManyRelationNode | ToOneRelationNode;

type FieldNode<T> = {
	field: keyof T;
	op: ConditionOperator;
	value: unknown;
};

export type ConditionNode<T extends Record<string, unknown>> =
	| FieldNode<T>
	| RelationNode
	| { and: ConditionNode<T>[] }
	| { or: ConditionNode<T>[] }
	| { not: ConditionNode<T> };
