export const RuleEffect = {
	Allow: "allow",
	Deny: "deny",
} as const;

export type RuleEffect = (typeof RuleEffect)[keyof typeof RuleEffect];

export const RULE_EFFECTS: readonly RuleEffect[] = Object.values(RuleEffect);
