import { describe, expect, it } from "vitest";
import { compileWhere } from "../src/api/index.js";
import { canMutate, validatePayload } from "../src/api/mutation.js";
import { evaluateCondition, evaluateRules } from "../src/evaluation/index.js";
import type { Rule } from "../src/model/index.js";

type Post = {
	authorId: string;
	status: "draft" | "published" | "archived";
	views: number;
};

const rows: unknown[] = [
	{ authorId: "u1", status: "draft", views: 10 },
	{ authorId: "u1", status: "published", views: 200 },
	{ authorId: "u2", status: "published", views: 50 },
	{ authorId: "u2", status: "archived", views: 0 },
	{ authorId: "u1", status: "published", views: "200" },
	{ authorId: "u1", status: null, views: 5 },
	{ authorId: "u1", status: "published" },
];

const payloads: unknown[] = [
	{ status: "draft" },
	{ views: 5 },
	{ status: "published", views: 5 },
	{},
];

const allowVariants: { name: string; rule: Rule<Post> }[] = [
	{
		name: "allow unconditional",
		rule: { effect: "allow", action: "update", resource: "post" },
	},
	{
		name: "allow where",
		rule: {
			effect: "allow",
			action: "update",
			resource: "post",
			where: { field: "authorId", op: "eq", value: "u1" },
		},
	},
	{
		name: "allow where + fields",
		rule: {
			effect: "allow",
			action: "update",
			resource: "post",
			where: { field: "authorId", op: "eq", value: "u1" },
			payload: { fields: ["status", "views"] },
		},
	},
];

const denyVariants: { name: string; rule?: Rule<Post> }[] = [
	{ name: "no deny" },
	{
		name: "deny unconditional",
		rule: { effect: "deny", action: "update", resource: "post" },
	},
	{
		name: "deny where",
		rule: {
			effect: "deny",
			action: "update",
			resource: "post",
			where: { field: "status", op: "eq", value: "archived" },
		},
	},
	{
		name: "deny empty payload",
		rule: { effect: "deny", action: "update", resource: "post", payload: {} },
	},
	{
		name: "deny payload fields",
		rule: {
			effect: "deny",
			action: "update",
			resource: "post",
			payload: { fields: ["status"] },
		},
	},
	{
		name: "deny payload constraints",
		rule: {
			effect: "deny",
			action: "update",
			resource: "post",
			payload: { constraints: { field: "status", op: "eq", value: "draft" } },
		},
	},
	{
		name: "deny where + payload fields",
		rule: {
			effect: "deny",
			action: "update",
			resource: "post",
			where: { field: "status", op: "eq", value: "archived" },
			payload: { fields: ["status"] },
		},
	},
];

const combinations = allowVariants.flatMap(({ name: allowName, rule: allow }) =>
	denyVariants.map(({ name: denyName, rule: deny }) => ({
		name: `${allowName} + ${denyName}`,
		rules: deny === undefined ? [allow] : [allow, deny],
	})),
);

describe("invariants over generated rule shapes", () => {
	describe("where() selects exactly the rows can() allows", () => {
		for (const { name, rules } of combinations) {
			it(name, () => {
				const condition = compileWhere(rules, "update", "post");

				for (const row of rows) {
					const walk = evaluateRules(rules, "update", "post", row);
					const query = evaluateCondition(condition, row as never);

					expect(query === true, `row ${JSON.stringify(row)}`).toBe(walk);
				}
			});
		}
	});

	describe("the row gate and the payload gate agree", () => {
		for (const { name, rules } of combinations) {
			it(name, () => {
				for (const row of rows) {
					const mayTouchRow = canMutate(rules, "update", "post", row);

					for (const data of payloads) {
						const result = validatePayload(rules, "update", "post", row, data);
						const context = `row ${JSON.stringify(row)} data ${JSON.stringify(data)}`;

						if (!mayTouchRow) {
							expect(result.ok, `${context}: refused row accepted data`).toBe(
								false,
							);
						}

						if (result.ok === false && result.violations.length === 0) {
							expect(
								mayTouchRow,
								`${context}: blanket veto with the row allowed`,
							).toBe(false);
						}
					}
				}
			});
		}
	});
});
