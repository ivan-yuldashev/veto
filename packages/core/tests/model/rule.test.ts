import { describe, expect, expectTypeOf, it } from "vitest";
import type {
	ConditionNode,
	FieldConditionNode,
} from "../../src/model/condition.js";
import type { Rule, RulePayload } from "../../src/model/rule.js";
import type { RuleEffect } from "../../src/shared/index.js";

type Post = {
	authorId: string;
	status: "draft" | "published";
	title: string;
};

describe("Rule (types)", () => {
	it("effect is allow | deny", () => {
		expectTypeOf<RuleEffect>().toEqualTypeOf<"allow" | "deny">();
	});

	it("where is a ConditionNode over the resource shape", () => {
		expectTypeOf<Rule<Post>["where"]>().toEqualTypeOf<
			ConditionNode<Post> | undefined
		>();
	});

	it("payload.fields are keys of the resource", () => {
		expectTypeOf<NonNullable<RulePayload<Post>["fields"]>>().toEqualTypeOf<
			(keyof Post)[]
		>();
	});

	it("payload.constraints is a ConditionNode over a partial resource", () => {
		expectTypeOf<RulePayload<Post>["constraints"]>().toEqualTypeOf<
			FieldConditionNode<Partial<Post>> | undefined
		>();
	});

	it("defaults to an untyped record when no shape is given", () => {
		expectTypeOf<Rule>().toEqualTypeOf<Rule<Record<string, unknown>>>();
	});

	it("accepts a well-formed allow rule", () => {
		const rule: Rule<Post> = {
			effect: "allow",
			action: ["update", "publish"],
			resource: "post",
			where: { field: "authorId", op: "eq", value: "u1" },
			payload: {
				fields: ["title", "status"],
				constraints: {
					field: "status",
					op: "in",
					value: ["draft", "published"],
				},
			},
		};
		expectTypeOf(rule).toEqualTypeOf<Rule<Post>>();
	});

	it("strictly rejects logical 'or' and 'not' in payload constraints (Compile-time fail)", () => {
		const ruleWithOr: Rule<Post> = {
			effect: "allow",
			action: "update",
			resource: "post",
			payload: {
				constraints: {
					// @ts-expect-error or is not allowed in FieldConditionNode (field / and only)
					or: [{ field: "status", op: "eq", value: "draft" }],
				},
			},
		};

		const ruleWithNot: Rule<Post> = {
			effect: "allow",
			action: "update",
			resource: "post",
			payload: {
				constraints: {
					// @ts-expect-error not is not allowed in FieldConditionNode (field / and only)
					not: { field: "status", op: "eq", value: "draft" },
				},
			},
		};

		expect(ruleWithOr).toBeDefined();
		expect(ruleWithNot).toBeDefined();
	});

	it("strictly rejects relations in payload constraints (Compile-time fail)", () => {
		const ruleWithRelation: Rule<Post> = {
			effect: "allow",
			action: "update",
			resource: "post",
			payload: {
				constraints: {
					// @ts-expect-error relation is not allowed in FieldConditionNode (field / and only)
					relation: "comments",
					type: "many",
					match: "some",
					where: { field: "approved", op: "eq", value: true },
				},
			},
		};

		expect(ruleWithRelation).toBeDefined();
	});
});
