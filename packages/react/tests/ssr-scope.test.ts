import type { CheckedRules } from "@vetojs/core";
import { buildAbility, createRules, defineAbilities, type } from "@vetojs/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";
import { createAbilityStore } from "../src/store.js";

type Post = { id: string; authorId: string };

const ac = defineAbilities({
	resources: { post: { schema: type<Post>(), actions: ["update"] } },
});

const { allow } = createRules(ac);
const { AbilityProvider, Can } = createVetoContext(ac);

const page = (rules: CheckedRules) =>
	renderToStaticMarkup(
		createElement(
			AbilityProvider,
			{ rules },
			createElement(Can, { I: "update", a: "post", fallback: "no" }, "yes"),
		),
	);

describe("the provider owns the store, so requests stay apart", () => {
	it("renders independent trees in one process without bleeding", () => {
		expect(page(allow("update", "post") ? [allow("update", "post")] : [])).toBe(
			"yes",
		);
		expect(page([])).toBe("no");
		expect(page([allow("update", "post")])).toBe("yes");
	});

	it("a store is mutable, which is exactly why it must not be module-scoped", () => {
		const store = createAbilityStore(
			buildAbility(ac, [allow("update", "post")]),
		);
		const before = store.get();

		store.publish(buildAbility(ac, []));

		expect(store.get()).not.toBe(before);
	});
});
