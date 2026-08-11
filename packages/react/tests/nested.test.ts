/** @vitest-environment jsdom */

import { createRules, defineAbilities, type } from "@vetojs/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string };

const ac = defineAbilities({
	resources: { post: { schema: type<Post>(), actions: ["read", "update"] } },
});

const { allow } = createRules(ac);
const { AbilityProvider, Can, useSetRules } = createVetoContext(ac);

describe("nested providers keep separate stores", () => {
	it("an inner setRules leaves the outer tree alone", () => {
		const container = document.createElement("div");
		document.body.append(container);
		const root: Root = createRoot(container);

		let promoteInner: (() => void) | undefined;

		const Inner = () => {
			const setRules = useSetRules();
			promoteInner = () => setRules([allow("update", "post")]);
			return null;
		};

		act(() =>
			root.render(
				createElement(
					AbilityProvider,
					{ rules: [] },
					createElement(
						Can,
						{ I: "update", a: "post", fallback: "outer:no" },
						"outer:yes",
					),
					createElement(
						AbilityProvider,
						{ rules: [] },
						createElement(Inner),
						createElement(
							Can,
							{ I: "update", a: "post", fallback: "inner:no" },
							"inner:yes",
						),
					),
				),
			),
		);

		expect(container.textContent).toBe("outer:noinner:no");

		act(() => promoteInner?.());

		expect(container.textContent).toBe("outer:noinner:yes");

		act(() => root.unmount());
	});
});
