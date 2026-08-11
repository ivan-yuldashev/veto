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
	ability?: AbilitySet<AC>;
	children?: ReactNode;
	fallback?: ReactNode;
};

export type ServerCanProps<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
> = {
	ability: AbilitySet<AC>;
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

export type UseCan<AC extends ResourceMap> = <R extends ResourceName<AC>>(
	action: ActionFor<AC, R>,
	resource: R,
	instance?: ShapeOf<AC, R>,
) => boolean;

export type VetoContext<AC extends ResourceMap> = {
	AbilityProvider: (props: AbilityProviderProps<AC>) => ReactNode;
	useAbility: () => AbilitySet<AC>;
	useCan: UseCan<AC>;
	useSetRules: () => (rules: CheckedRules) => void;
	Can: <R extends ResourceName<AC>>(props: CanProps<AC, R>) => ReactNode;
};
