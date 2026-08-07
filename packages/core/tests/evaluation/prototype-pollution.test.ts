import { afterEach, describe, expect, it } from "vitest";
import { buildAbility } from "../../src/api/ability.js";
import type { CheckedRules } from "../../src/api/checked-rules.types.js";
import { defineAbilities } from "../../src/api/define-abilities.js";
import { validatePayload } from "../../src/api/mutation.js";
import { type } from "../../src/api/schema.js";
import { markLoaded } from "../../src/evaluation/loaded.js";
import type { Rule } from "../../src/model/index.js";
import { isPlainObject } from "../../src/shared/utils/isPlainObject.js";

type Post = { id: string; authorId: string; featured: boolean };
const ac = defineAbilities({
	resources: { post: { schema: type<Post>(), actions: ["update", "read"] } },
});

const cleanProto = () => {
	for (const key of ["isAdmin", "authorId", "polluted", "evil"]) {
		delete (Object.prototype as Record<string, unknown>)[key];
	}
};

describe("prototype pollution / inherited-property immunity", () => {
	afterEach(cleanProto);

	it("a __proto__ payload key does not pollute Object.prototype", () => {
		const rules: Rule<Post>[] = [
			{ effect: "allow", action: "update", resource: "post" },
		];
		const evil = JSON.parse('{"__proto__":{"isAdmin":true}}');
		validatePayload(rules, "update", "post", { id: "p" }, evil);
		expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
	});

	it("a constructor.prototype payload key does not pollute", () => {
		const rules: Rule<Post>[] = [
			{ effect: "allow", action: "update", resource: "post" },
		];
		const evil = JSON.parse('{"constructor":{"prototype":{"polluted":true}}}');
		validatePayload(rules, "update", "post", { id: "p" }, evil);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});

	it("markLoaded never pollutes Object.prototype globally", () => {
		markLoaded({ id: "p" } as Record<string, unknown>, "__proto__", {
			evil: true,
		});
		expect(({} as Record<string, unknown>).evil).toBeUndefined();
	});

	it("a where check reads OWN fields only — immune to a polluted prototype", () => {
		(Object.prototype as Record<string, unknown>).authorId = "victim";
		const ability = buildAbility(ac, [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: { field: "authorId", op: "eq", value: "victim" },
			},
		] as CheckedRules);
		expect(ability.can("read", "post", { id: "p" } as Post)).toBe(false);
	});

	it("an own field still evaluates normally", () => {
		const ability = buildAbility(ac, [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: { field: "authorId", op: "eq", value: "me" },
			},
		] as CheckedRules);
		expect(
			ability.can("read", "post", { id: "p", authorId: "me" } as Post),
		).toBe(true);
	});

	it("isPlainObject rejects class instances and arrays", () => {
		expect(isPlainObject(new (class Foo {})())).toBe(false);
		expect(isPlainObject([])).toBe(false);
		expect(isPlainObject(Object.create(null))).toBe(true);
	});
});
