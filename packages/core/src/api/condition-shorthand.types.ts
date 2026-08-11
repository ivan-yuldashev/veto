import { ConditionOperator } from "../shared/index.js";

type NumberDateOperators<V> =
	| { [ConditionOperator.GreaterThan]: V }
	| { [ConditionOperator.GreaterThanOrEqual]: V }
	| { [ConditionOperator.LessThan]: V }
	| { [ConditionOperator.LessThanOrEqual]: V };

type Scalar = string | number | boolean | bigint | Date;

type ScalarOperators<V> =
	| { [ConditionOperator.Equal]: V }
	| { [ConditionOperator.NotEqual]: V }
	| { [ConditionOperator.In]: V[] }
	| { [ConditionOperator.NotIn]: V[] }
	| { [ConditionOperator.Exists]: boolean }
	| (V extends number | Date ? NumberDateOperators<V> : never)
	| (V extends string ? { contains: string } : never);

type ArrayOperators<E> =
	| { [ConditionOperator.Has]: E }
	| { [ConditionOperator.HasAny]: E[] }
	| { [ConditionOperator.HasAll]: E[] }
	| { [ConditionOperator.Exists]: boolean };

/**
 * A field value in shorthand: either a bare value (meaning `eq`) or an operator object.
 *
 * What a field is offered follows from what the engine can decide about it.
 *
 * A **scalar** field takes a bare value or any comparison operator.
 *
 * An **array of scalars** takes `has` / `hasAny` / `hasAll` and `exists`. It is never
 * compared as a whole: two arrays are different references, so `eq` could only ever answer
 * "unknown" — a rule that grants nothing and fires every `deny` regardless of the row.
 * `hasAny` and `hasAll` are conveniences over `or` and `and` around `has`.
 *
 * Anything else — a nested object, an array of objects — takes only `exists`. Model it as a
 * [relation](../../docs/relations.md) if you need to match inside it; the engine compares
 * scalars.
 */
export type FieldValue<V> = [Exclude<V, undefined | null>] extends [
	readonly (infer E)[],
]
	? [Exclude<E, undefined | null>] extends [Scalar]
		? ArrayOperators<E>
		: { [ConditionOperator.Exists]: boolean }
	: [Exclude<V, undefined | null>] extends [Scalar]
		? V | ScalarOperators<V>
		: { [ConditionOperator.Exists]: boolean };

export type PayloadConstraintCondition<T> = {
	[K in Exclude<keyof T, "and" | "or" | "not">]?: FieldValue<T[K]>;
} & {
	and?: PayloadConstraintCondition<T>[];
};
