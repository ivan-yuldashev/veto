import type { Relation } from "./define-abilities.types.js";

export type Vocabulary = {
	[resource: string]: {
		actions: readonly string[];
		relations?: Record<string, Relation>;
	};
};
