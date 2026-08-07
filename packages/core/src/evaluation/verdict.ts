import type { Verdict } from "./verdict.types.js";

export type { Verdict } from "./verdict.types.js";

export const kleeneAndOver = <T>(
	items: readonly T[],
	verdictOf: (item: T) => Verdict,
): Verdict => {
	let result: Verdict = true;

	for (const item of items) {
		const verdict = verdictOf(item);

		if (verdict === false) {
			result = false;
			continue;
		}

		if (verdict === undefined && result === true) {
			result = undefined;
		}
	}

	return result;
};

export const kleeneOrOver = <T>(
	items: readonly T[],
	verdictOf: (item: T) => Verdict,
): Verdict => {
	let result: Verdict = false;

	for (const item of items) {
		const verdict = verdictOf(item);

		if (verdict === true) {
			result = true;
			continue;
		}

		if (verdict === undefined && result === false) {
			result = undefined;
		}
	}

	return result;
};

export const kleeneNot = (verdict: Verdict): Verdict => {
	return verdict === undefined ? undefined : !verdict;
};
