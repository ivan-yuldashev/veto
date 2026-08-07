/** @vitest-environment jsdom */

import { buildAbility, createRules, defineAbilities, type } from "@vetojs/core";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string; authorId: string };

const ac = defineAbilities({
	resources: {
		post: { schema: type<Post>(), actions: ["read", "update"] },
	},
});
const { allow } = createRules(ac);
const { AbilityProvider, useAbility, Can } = createVetoContext(ac);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});

afterEach(() => {
	act(() => root.unmount());
	container.remove();
});

const render = (node: ReactNode) => act(() => root.render(node));

describe("AbilityProvider + Can (render)", () => {
	it("renders children when the action is allowed", () => {
		render(
			createElement(
				AbilityProvider,
				{ rules: [allow("update", "post")] },
				createElement(Can, { I: "update", a: "post" }, "Edit"),
			),
		);
		expect(container.textContent).toBe("Edit");
	});

	it("renders the fallback when the action is denied", () => {
		render(
			createElement(
				AbilityProvider,
				{ rules: [] },
				createElement(Can, { I: "update", a: "post", fallback: "No" }, "Edit"),
			),
		);
		expect(container.textContent).toBe("No");
	});

	it("gates by the instance passed via this", () => {
		const rules = [
			allow("update", "post", { where: { authorId: { eq: "u1" } } }),
		];
		const toolbar = (post: Post) =>
			createElement(
				AbilityProvider,
				{ rules },
				createElement(Can, { I: "update", a: "post", this: post }, "Edit"),
			);

		render(toolbar({ id: "p1", authorId: "u1" }));
		expect(container.textContent).toBe("Edit");

		render(toolbar({ id: "p2", authorId: "u2" }));
		expect(container.textContent).toBe("");
	});

	it("accepts a prebuilt ability instead of rules", () => {
		const ability = buildAbility(ac, [allow("read", "post")]);
		render(
			createElement(
				AbilityProvider,
				{ ability },
				createElement(Can, { I: "read", a: "post" }, "Visible"),
			),
		);
		expect(container.textContent).toBe("Visible");
	});

	it("useAbility throws outside the provider", () => {
		const silenced = vi.spyOn(console, "error").mockImplementation(() => {});
		const Orphan = () => {
			useAbility();
			return null;
		};
		expect(() => render(createElement(Orphan))).toThrow(
			"useAbility must be used within <AbilityProvider>",
		);
		silenced.mockRestore();
	});
});
