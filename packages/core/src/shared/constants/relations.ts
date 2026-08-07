export const RelationKind = {
	One: "one",
	Many: "many",
} as const;

export type RelationKind = (typeof RelationKind)[keyof typeof RelationKind];

export const RELATION_KINDS: readonly RelationKind[] =
	Object.values(RelationKind);

export const MatchQuantifier = {
	Some: "some",
	Every: "every",
	None: "none",
} as const;

export type MatchQuantifier =
	(typeof MatchQuantifier)[keyof typeof MatchQuantifier];

export const MATCH_QUANTIFIERS: readonly string[] =
	Object.values(MatchQuantifier);
