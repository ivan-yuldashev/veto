import type { ResourceMap } from "./define-abilities.js";
import type { Vocabulary } from "./vocabulary.types.js";

export type { Vocabulary } from "./vocabulary.types.js";

/**
 * Reduces declarations to the serializable names {@link parseRules} needs — resources,
 * their actions and relations, without the schemas.
 *
 * Use it when the vocabulary has to be stored or shipped; passing `ac` directly works too.
 */
export const toVocabulary = (ac: ResourceMap): Vocabulary => {
	return Object.fromEntries(
		Object.entries(ac).map(([resource, definition]) => [
			resource,
			{
				actions: [...definition.actions],
				...(definition.relations === undefined
					? {}
					: { relations: { ...definition.relations } }),
			},
		]),
	);
};
