import { ConditionOperator } from "../shared/index.js";

type NumberDateOperators<V> =
	| { [ConditionOperator.GreaterThan]: V }
	| { [ConditionOperator.GreaterThanOrEqual]: V }
	| { [ConditionOperator.LessThan]: V }
	| { [ConditionOperator.LessThanOrEqual]: V };

type Operators<V> =
	| { [ConditionOperator.Equal]: V }
	| { [ConditionOperator.NotEqual]: V }
	| { [ConditionOperator.In]: V[] }
	| { [ConditionOperator.NotIn]: V[] }
	| { [ConditionOperator.Exists]: boolean }
	| (V extends number | Date ? NumberDateOperators<V> : never)
	| (V extends string ? { contains: string } : never);

/**
 * A field value in shorthand: either a bare value (meaning `eq`) or an operator object.
 *
 * Array-typed fields accept only the operator form. A bare array would mean "equals this
 * array", which the engine answers by reference — never true for a row loaded from a
 * database. Write `{ in: [...] }` to test membership, or `{ eq: [...] }` to really compare
 * references.
 */
export type FieldValue<V> = [Exclude<V, undefined>] extends [readonly unknown[]]
	? Operators<V>
	: V | Operators<V>;

export type PayloadConstraintCondition<T> = {
	[K in Exclude<keyof T, "and" | "or" | "not">]?: FieldValue<T[K]>;
} & {
	and?: PayloadConstraintCondition<T>[];
};
