import type { Rule } from "../model/index.js";

export type CheckedRule = Rule & { readonly "~veto.checked": true };

export type CheckedRules = CheckedRule[];
