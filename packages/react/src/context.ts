"use client";

import type { AbilitySet, ResourceMap, ResourceName } from "@vetojs/core";
import { buildAbility } from "@vetojs/core";
import { createContext, createElement, useContext, useMemo } from "react";
import type { AbilityProviderProps, CanProps, VetoContext } from "./types.js";

/**
 * Creates React bindings that know your resources.
 *
 * A factory rather than a plain import, because typed bindings need your `ac` — the payoff
 * is that `<Can>` autocompletes actions per resource and rejects ones that do not exist.
 * Call it once in a module and import the bindings from there.
 *
 * @example
 * // src/veto.ts
 * export const { AbilityProvider, useAbility, Can } = createVetoContext(ac);
 */
export const createVetoContext = <AC extends ResourceMap>(
	ac: AC,
): VetoContext<AC> => {
	const Context = createContext<AbilitySet<AC> | null>(null);

	const AbilityProvider = (props: AbilityProviderProps<AC>) => {
		const { ability: prebuilt, rules } = props;

		const ability = useMemo(
			() => prebuilt ?? buildAbility(ac, rules ?? []),
			[prebuilt, rules],
		);

		return createElement(Context.Provider, { value: ability }, props.children);
	};

	const useAbility = (): AbilitySet<AC> => {
		const ability = useContext(Context);

		if (ability === null) {
			throw new Error("useAbility must be used within <AbilityProvider>");
		}

		return ability;
	};

	const Can = <R extends ResourceName<AC>>({
		I,
		a,
		this: instance,
		children,
		fallback = null,
	}: CanProps<AC, R>) => {
		const ability = useAbility();
		return ability.can(I, a, instance) ? children : fallback;
	};

	return { AbilityProvider, useAbility, Can };
};
