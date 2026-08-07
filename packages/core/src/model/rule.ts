import type { RuleEffect } from "../shared/index.js";
import type { ConditionNode, FieldConditionNode } from "./condition.js";

export type RulePayload<T extends Record<string, unknown>> = {
	fields?: (keyof T)[];
	constraints?: FieldConditionNode<Partial<T>>;
};

export type Rule<T extends Record<string, unknown> = Record<string, unknown>> =
	{
		effect: RuleEffect;
		action: string | string[];
		resource: string;
		where?: ConditionNode<T>;
		payload?: RulePayload<T>;
	};
