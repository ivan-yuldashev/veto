export const ConditionOperator = {
	Equal: "eq",
	NotEqual: "ne",
	In: "in",
	NotIn: "nin",
	GreaterThan: "gt",
	GreaterThanOrEqual: "gte",
	LessThan: "lt",
	LessThanOrEqual: "lte",
	Contains: "contains",
	Exists: "exists",
} as const;

export type ConditionOperator =
	(typeof ConditionOperator)[keyof typeof ConditionOperator];

export const CONDITION_OPERATORS: readonly string[] =
	Object.values(ConditionOperator);
