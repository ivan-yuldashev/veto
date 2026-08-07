import type { Rule } from "../model/index.js";

export type UnknownRule = {
	rule: Rule;
	reasons: string[];
	quarantined: boolean;
};

export type RuleParseResult<Rules extends Rule[] = Rule[]> =
	| { ok: true; rules: Rules; unknown: UnknownRule[] }
	| { ok: false; errors: string[] };
