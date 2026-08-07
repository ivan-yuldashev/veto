import { describe, expect, it } from "vitest";
import { defineAbilities } from "../../src/api/define-abilities.js";
import { type } from "../../src/api/schema.js";
import { compileWhereInput } from "../../src/api/where-input.js";

const ac = defineAbilities({
	resources: {
		post: {
			schema: type<{
				id: string;
				status: "draft" | "published";
				views: number;
			}>(),
			actions: ["read"],
			relations: {
				author: { resource: "user", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		user: { schema: type<{ id: string; role: string }>(), actions: ["read"] },
		comment: {
			schema: type<{ id: string; approved: boolean }>(),
			actions: ["read"],
		},
	},
});

describe("compileWhereInput", () => {
	it("compiles a direct value to eq", () => {
		expect(compileWhereInput({ status: "published" }, ac, "post")).toEqual({
			field: "status",
			op: "eq",
			value: "published",
		});
	});

	it("compiles an operator object", () => {
		expect(compileWhereInput({ views: { gt: 100 } }, ac, "post")).toEqual({
			field: "views",
			op: "gt",
			value: 100,
		});
	});

	it("ands multiple sibling keys", () => {
		expect(
			compileWhereInput({ status: "draft", views: 0 }, ac, "post"),
		).toEqual({
			and: [
				{ field: "status", op: "eq", value: "draft" },
				{ field: "views", op: "eq", value: 0 },
			],
		});
	});

	it("compiles an empty where to {and: []}", () => {
		expect(compileWhereInput({}, ac, "post")).toEqual({ and: [] });
	});

	it("compiles a to-one relation (nested object)", () => {
		expect(
			compileWhereInput({ author: { role: "admin" } }, ac, "post"),
		).toEqual({
			relation: "author",
			type: "one",
			where: { field: "role", op: "eq", value: "admin" },
		});
	});

	it("compiles a to-many relation with a quantifier", () => {
		expect(
			compileWhereInput(
				{ comments: { every: { approved: true } } },
				ac,
				"post",
			),
		).toEqual({
			relation: "comments",
			type: "many",
			match: "every",
			where: { field: "approved", op: "eq", value: true },
		});
	});

	it("compiles or and not", () => {
		expect(
			compileWhereInput(
				{ or: [{ status: "draft" }, { status: "published" }] },
				ac,
				"post",
			),
		).toEqual({
			or: [
				{ field: "status", op: "eq", value: "draft" },
				{ field: "status", op: "eq", value: "published" },
			],
		});
		expect(compileWhereInput({ not: { status: "draft" } }, ac, "post")).toEqual(
			{
				not: { field: "status", op: "eq", value: "draft" },
			},
		);
	});

	it("combines a field and a relation", () => {
		expect(
			compileWhereInput(
				{ status: "published", author: { role: "admin" } },
				ac,
				"post",
			),
		).toEqual({
			and: [
				{ field: "status", op: "eq", value: "published" },
				{
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				},
			],
		});
	});

	it("skips undefined values, leaving an empty where", () => {
		expect(compileWhereInput({ status: undefined }, ac, "post")).toEqual({
			and: [],
		});
	});

	it("nests relations (to-one inside the related shape)", () => {
		expect(
			compileWhereInput(
				{ comments: { some: { approved: true } }, author: { role: "admin" } },
				ac,
				"post",
			),
		).toEqual({
			and: [
				{
					relation: "comments",
					type: "many",
					match: "some",
					where: { field: "approved", op: "eq", value: true },
				},
				{
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				},
			],
		});
	});
});

// A never-matching node is `{ or: [] }`: an empty OR can never be satisfied.
const NOTHING = { or: [] };

describe("compileWhereInput — malformed input compiles fail-closed", () => {
	it("compiles a non-object shorthand to nothing", () => {
		expect(compileWhereInput("garbage", ac, "post")).toEqual(NOTHING);
		expect(compileWhereInput(null, ac, "post")).toEqual(NOTHING);
		expect(compileWhereInput([], ac, "post")).toEqual(NOTHING);
	});

	it("compiles a non-array and/or to nothing", () => {
		expect(compileWhereInput({ and: "garbage" }, ac, "post")).toEqual(NOTHING);
		expect(compileWhereInput({ or: 42 }, ac, "post")).toEqual(NOTHING);
	});

	// Garbage under `not` must not compile to a false node: negating it would
	// turn the rule TRUE and hand out access.
	it("compiles garbage under not to nothing, never to a negated falsehood", () => {
		expect(compileWhereInput({ not: "garbage" }, ac, "post")).toEqual(NOTHING);
		expect(compileWhereInput({ not: null }, ac, "post")).toEqual(NOTHING);
	});

	it("compiles a to-many relation with a non-object value to nothing", () => {
		expect(compileWhereInput({ comments: "garbage" }, ac, "post")).toEqual(
			NOTHING,
		);
	});

	it("compiles an unknown quantifier to nothing", () => {
		expect(
			compileWhereInput({ comments: { most: { approved: true } } }, ac, "post"),
		).toEqual(NOTHING);
	});

	it("compiles a quantifier with a non-object body to nothing", () => {
		expect(
			compileWhereInput({ comments: { some: "garbage" } }, ac, "post"),
		).toEqual(NOTHING);
	});

	it("compiles a to-one relation with a garbage body to a never-matching relation", () => {
		expect(compileWhereInput({ author: "garbage" }, ac, "post")).toEqual({
			relation: "author",
			type: "one",
			where: NOTHING,
		});
	});

	it("treats an unknown resource as having no relations", () => {
		expect(
			compileWhereInput({ author: { role: "admin" } }, ac, "ghost"),
		).toEqual({ field: "author", op: "eq", value: { role: "admin" } });
	});
});
