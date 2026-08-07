import type {
	AbilitySet,
	ActionFor,
	CheckedRules,
	ResourceMap,
	ResourceName,
	ShapeOf,
} from "@vetojs/core";
import type { ReactNode } from "react";

export type CanProps<AC extends ResourceMap, R extends ResourceName<AC>> = {
	I: ActionFor<AC, R>;
	a: R;
	this?: ShapeOf<AC, R>;
	children?: ReactNode;
	fallback?: ReactNode;
};

export type AbilityProviderProps<AC extends ResourceMap> = {
	children?: ReactNode;
} & (
	| { rules: CheckedRules; ability?: never }
	| { ability: AbilitySet<AC>; rules?: never }
);

export type VetoContext<AC extends ResourceMap> = {
	AbilityProvider: (props: AbilityProviderProps<AC>) => ReactNode;
	useAbility: () => AbilitySet<AC>;
	Can: <R extends ResourceName<AC>>(props: CanProps<AC, R>) => ReactNode;
};
