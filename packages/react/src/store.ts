import type { AbilitySet, ResourceMap } from "@vetojs/core";

export type AbilityStore<AC extends ResourceMap> = {
	get: () => AbilitySet<AC>;
	publish: (next: AbilitySet<AC>) => void;
	subscribe: (listener: VoidFunction) => VoidFunction;
};

export const createAbilityStore = <AC extends ResourceMap>(
	initial: AbilitySet<AC>,
): AbilityStore<AC> => {
	let current = initial;
	const listeners = new Set<VoidFunction>();

	return {
		get: () => current,
		publish: (next) => {
			if (next === current) {
				return;
			}

			current = next;

			for (const listener of [...listeners]) {
				listener();
			}
		},
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
};
