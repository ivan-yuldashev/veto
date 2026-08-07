import type { CheckedRule } from "./checked-rules.types.js";
import type { PayloadConstraintCondition } from "./condition-shorthand.types.js";
import type {
	ActionFor,
	ResourceMap,
	ResourceName,
	ShapeOf,
} from "./define-abilities.types.js";
import type { WhereInput } from "./where-input.types.js";

type Payload<AC extends ResourceMap, R extends ResourceName<AC>> = {
	fields?: (keyof ShapeOf<AC, R>)[];
	constraints?: PayloadConstraintCondition<Partial<ShapeOf<AC, R>>>;
};

type RuleOptions<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	D extends number = 3,
> = {
	where?: WhereInput<AC, R, D>;
	payload?: Payload<AC, R>;
};

export type RuleFactory<AC extends ResourceMap, D extends number> = <
	R extends ResourceName<AC>,
>(
	action: ActionFor<AC, R> | ActionFor<AC, R>[],
	resource: R,
	options?: RuleOptions<AC, R, D>,
) => CheckedRule;
