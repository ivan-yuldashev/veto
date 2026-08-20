import { describe, expect, expectTypeOf, it } from "vitest";
import { buildAbility } from "../../src/api/ability.js";
import type {
	CheckedRule,
	CheckedRules,
} from "../../src/api/checked-rules.types.js";
import { createRules } from "../../src/api/create-rules.js";
import { defineAbilities } from "../../src/api/define-abilities.js";
import { shape, type } from "../../src/api/index.js";

type Post = { id: string; authorId: string };

describe("the names the package exports", () => {
	it("names one checked rule the way it names many", () => {
		const ac = defineAbilities({
			resources: { post: { schema: type<Post>(), actions: ["read"] } },
		});
		const { allow } = createRules(ac);
		const one: CheckedRule = allow("read", "post");

		expectTypeOf<CheckedRules>().toEqualTypeOf<CheckedRule[]>();
		expect(one.resource).toBe("post");
	});

	it("declares a shape under either name", () => {
		const viaType = defineAbilities({
			resources: { post: { schema: type<Post>(), actions: ["read"] } },
		});
		const viaShape = defineAbilities({
			resources: { post: { schema: shape<Post>(), actions: ["read"] } },
		});

		expect(shape).toBe(type);
		expect(buildAbility(viaShape, []).rules).toEqual(
			buildAbility(viaType, []).rules,
		);
	});

	it("keeps the row shape when the schema was declared as a shape", () => {
		const ac = defineAbilities({
			resources: { post: { schema: shape<Post>(), actions: ["read"] } },
		});
		const ability = buildAbility(ac, []);

		expect(ability.can("read", "post", { id: "p1", authorId: "u1" })).toBe(
			false,
		);

		// @ts-expect-error the row must still match the declared shape
		ability.can("read", "post", { nope: true });
	});
});
