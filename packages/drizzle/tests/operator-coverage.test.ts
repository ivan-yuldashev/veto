import { type ConditionNode, ConditionOperator } from "@vetojs/core";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { toDrizzle } from "../src/index.js";

const posts = pgTable("posts", {
	status: text("status"),
	views: integer("views"),
	labels: text("labels").array(),
});

const target: Record<ConditionOperator, { field: string; value: unknown }> = {
	[ConditionOperator.Equal]: { field: "status", value: "draft" },
	[ConditionOperator.NotEqual]: { field: "status", value: "draft" },
	[ConditionOperator.In]: { field: "status", value: ["draft"] },
	[ConditionOperator.NotIn]: { field: "status", value: ["draft"] },
	[ConditionOperator.GreaterThan]: { field: "views", value: 1 },
	[ConditionOperator.GreaterThanOrEqual]: { field: "views", value: 1 },
	[ConditionOperator.LessThan]: { field: "views", value: 1 },
	[ConditionOperator.LessThanOrEqual]: { field: "views", value: 1 },
	[ConditionOperator.Contains]: { field: "status", value: "raf" },
	[ConditionOperator.Exists]: { field: "status", value: true },
	[ConditionOperator.Has]: { field: "labels", value: "x" },
	[ConditionOperator.HasAny]: { field: "labels", value: ["x"] },
	[ConditionOperator.HasAll]: { field: "labels", value: ["x"] },
};

describe("every operator the engine knows has a SQL translation", () => {
	it("the fixture names every ConditionOperator, so a new one fails here first", () => {
		expect(Object.keys(target).sort()).toEqual(
			Object.values(ConditionOperator).sort(),
		);
	});

	for (const op of Object.values(ConditionOperator)) {
		it(`compiles "${op}" instead of refusing it`, () => {
			const { field, value } = target[op];
			const node = { field, op, value } as unknown as ConditionNode<
				Record<string, unknown>
			>;

			expect(() => toDrizzle(node, posts)).not.toThrow(
				/has no SQL translation/,
			);
		});
	}
});
