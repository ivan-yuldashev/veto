/** @vitest-environment jsdom */

import {
	buildAbility,
	type CheckedRules,
	createRules,
	defineAbilities,
	shape,
} from "@vetojs/core";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string; authorId: string };
const ac = defineAbilities({
	resources: { post: { schema: shape<Post>(), actions: ["read", "update"] } },
});
const { allow, deny } = createRules(ac);
const { AbilityProvider, Can } = createVetoContext(ac);

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

describe("react probes", () => {
	it("rebuilds the ability when rules change (no stale grant)", () => {
		const tree = (rules: CheckedRules) =>
			createElement(
				AbilityProvider,
				{ rules },
				createElement(Can, { I: "update", a: "post", fallback: "NO" }, "YES"),
			);

		render(tree([allow("update", "post")]));
		expect(container.textContent).toBe("YES");

		render(tree([allow("update", "post"), deny("update", "post")]));
		expect(container.textContent).toBe("NO");
	});

	it("denies when rules is undefined at runtime", () => {
		render(
			createElement(
				AbilityProvider,
				{ rules: undefined } as never,
				createElement(Can, { I: "read", a: "post", fallback: "NO" }, "YES"),
			),
		);
		expect(container.textContent).toBe("NO");
	});

	it("prefers a prebuilt ability over rules", () => {
		const ability = buildAbility(ac, [allow("read", "post")]);
		render(
			createElement(
				AbilityProvider,
				{ ability, rules: [] } as never,
				createElement(Can, { I: "read", a: "post", fallback: "NO" }, "YES"),
			),
		);
		expect(container.textContent).toBe("YES");
	});
});
