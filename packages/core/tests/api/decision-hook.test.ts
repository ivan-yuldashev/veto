import { describe, expect, it, vi } from "vitest";
import { buildAbility } from "../../src/api/ability.js";
import type { DecisionReport } from "../../src/api/ability.types.js";
import { createRules } from "../../src/api/create-rules.js";
import { defineAbilities } from "../../src/api/define-abilities.js";
import { type } from "../../src/api/schema.js";
import { ForbiddenError } from "../../src/errors/index.js";

type Post = { id: string; authorId: string; status: "draft" | "published" };

const ac = defineAbilities({
	resources: {
		post: { schema: type<Post>(), actions: ["read", "update"] },
	},
});

const { allow, deny } = createRules(ac);
const own: Post = { id: "p1", authorId: "u1", status: "draft" };
const other: Post = { id: "p2", authorId: "u2", status: "draft" };

const record = () => {
	const seen: DecisionReport[] = [];

	return {
		seen,
		onDecision: (decision: DecisionReport) => seen.push(decision),
	};
};

describe("the decision hook", () => {
	it("reports the allow that granted", () => {
		const { seen, onDecision } = record();
		const rule = allow("read", "post", { where: { authorId: { eq: "u1" } } });
		const ability = buildAbility(ac, [rule], { onDecision });

		expect(ability.can("read", "post", own)).toBe(true);
		expect(seen).toEqual([
			{ action: "read", resource: "post", allowed: true, rule },
		]);
	});

	it("reports the deny that fired, not the allow it overrode", () => {
		const { seen, onDecision } = record();
		const permit = allow("read", "post");
		const forbid = deny("read", "post", {
			where: { authorId: { eq: "u2" } },
		});
		const ability = buildAbility(ac, [permit, forbid], { onDecision });

		expect(ability.can("read", "post", other)).toBe(false);
		expect(seen[0]?.rule).toBe(forbid);
	});

	it("names no rule when the default denied", () => {
		const { seen, onDecision } = record();
		const ability = buildAbility(ac, [], { onDecision });

		expect(ability.can("read", "post", own)).toBe(false);
		expect(seen).toEqual([
			{ action: "read", resource: "post", allowed: false },
		]);
		expect(seen[0] && "rule" in seen[0]).toBe(false);
	});

	it("reports the row-less question as the optimistic answer it is", () => {
		const { seen, onDecision } = record();
		const rule = allow("read", "post", { where: { authorId: { eq: "u1" } } });
		const ability = buildAbility(ac, [rule], { onDecision });

		expect(ability.can("read", "post")).toBe(true);
		expect(seen).toEqual([
			{ action: "read", resource: "post", allowed: true, rule },
		]);
	});

	it("reports once per question, whichever way it is asked", () => {
		const { seen, onDecision } = record();
		const ability = buildAbility(ac, [allow("read", "post")], { onDecision });

		ability.can("read", "post", own);
		ability.cannot("read", "post", own);
		ability.authorize("read", "post", own);

		expect(seen).toHaveLength(3);
		expect(seen.every((decision) => decision.allowed)).toBe(true);
	});

	it("reports the refusal before authorize throws", () => {
		const { seen, onDecision } = record();
		const ability = buildAbility(ac, [], { onDecision });

		expect(() => ability.authorize("read", "post", own)).toThrow(
			ForbiddenError,
		);
		expect(seen).toEqual([
			{ action: "read", resource: "post", allowed: false },
		]);
	});

	it("reports mutations, both the row gate and the payload gate", () => {
		const { seen, onDecision } = record();
		const rule = allow("update", "post", { payload: { fields: ["status"] } });
		const ability = buildAbility(ac, [rule], { onDecision });

		expect(ability.canMutate("update", "post", own)).toBe(true);
		expect(
			ability.validatePayload("update", "post", own, { status: "published" })
				.ok,
		).toBe(true);
		expect(
			ability.validatePayload("update", "post", own, { authorId: "u2" }).ok,
		).toBe(false);

		expect(seen.map((decision) => decision.allowed)).toEqual([
			true,
			true,
			false,
		]);
	});

	it("stays silent for the questions that are not decisions", () => {
		const { seen, onDecision } = record();
		const ability = buildAbility(ac, [allow("update", "post")], { onDecision });

		ability.where("read", "post");
		ability.permittedFields("update", "post", ["status"]);
		ability.validate("post", own);

		expect(seen).toEqual([]);
	});

	it("answers the same with a hook as without one", () => {
		const rules = [
			allow("read", "post"),
			deny("read", "post", { where: { status: { eq: "draft" } } }),
		];
		const silent = buildAbility(ac, rules);
		const watched = buildAbility(ac, rules, { onDecision: () => {} });

		for (const row of [own, other, { ...own, status: "published" as const }]) {
			expect(watched.can("read", "post", row)).toBe(
				silent.can("read", "post", row),
			);
		}
	});

	it("cannot change the verdict by mutating the report", () => {
		const ability = buildAbility(ac, [allow("read", "post")], {
			onDecision: (decision) => {
				(decision as { allowed: boolean }).allowed = false;
			},
		});

		expect(ability.can("read", "post", own)).toBe(true);
	});

	it("lets a broken hook surface instead of hiding it", () => {
		const ability = buildAbility(ac, [allow("read", "post")], {
			onDecision: () => {
				throw new TypeError("the log is down");
			},
		});

		expect(() => ability.can("read", "post", own)).toThrow(TypeError);
	});

	it("costs nothing when no hook is given", () => {
		const onDecision = vi.fn();
		const ability = buildAbility(ac, [allow("read", "post")]);

		expect(ability.can("read", "post", own)).toBe(true);
		expect(onDecision).not.toHaveBeenCalled();
	});
});
