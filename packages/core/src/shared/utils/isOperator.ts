import {
	CONDITION_OPERATORS,
	type ConditionOperator,
} from "../constants/operators.js";

export const isOperator = (
	operator: unknown,
): operator is ConditionOperator => {
	return typeof operator === "string" && CONDITION_OPERATORS.includes(operator);
};
