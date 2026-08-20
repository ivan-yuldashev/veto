/** @vitest-environment jsdom */

import { createRules, defineAbilities, shape } from "@vetojs/core";
import { act, createElement, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import * as storeModule from "../src/store.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string };
const ac = defineAbilities({
	resources: { post: { schema: shape<Post>(), actions: ["read"] } },
});
const { allow } = createRules(ac);

let subscribes = 0;
let unsubscribes = 0;

const real = storeModule.createAbilityStore;

vi.spyOn(storeModule, "createAbilityStore").mockImplementation((initial) => {
	const store = real(initial);
	return {
		...store,
		subscribe: (listener) => {
			subscribes += 1;
			const release = store.subscribe(listener);
			return () => {
				unsubscribes += 1;
				release();
			};
		},
	};
});

const { createVetoContext } = await import("../src/context.js");
const { AbilityProvider, useCan } = createVetoContext(ac);

const Gate = ({ post }: { post: Post }) =>
	useCan("read", "post", post) ? "y" : "n";

const mount = (node: ReturnType<typeof createElement>): Root => {
	const container = document.createElement("div");
	document.body.append(container);
	const root = createRoot(container);
	act(() => root.render(node));
	return root;
};

describe("subscriptions are released", () => {
	it("survives consumers churning under a live provider", () => {
		subscribes = 0;
		unsubscribes = 0;
		let setCount: ((n: number) => void) | undefined;

		const App = () => {
			const [count, set] = useState(10);
			setCount = set;
			return createElement(
				AbilityProvider,
				{ rules: [allow("read", "post")] },
				...Array.from({ length: count }, (_, index) =>
					createElement(Gate, {
						key: String(index),
						post: { id: `p${index}` },
					}),
				),
			);
		};

		const root = mount(createElement(App));
		for (const count of [3, 12, 1, 15, 0]) act(() => setCount?.(count));
		act(() => root.unmount());

		expect(subscribes).toBeGreaterThan(0);
		expect(subscribes - unsubscribes).toBe(0);
	});

	it("strands nothing under StrictMode", () => {
		subscribes = 0;
		unsubscribes = 0;

		const root = mount(
			createElement(
				StrictMode,
				null,
				createElement(
					AbilityProvider,
					{ rules: [allow("read", "post")] },
					createElement(Gate, { post: { id: "p1" } }),
				),
			),
		);
		act(() => root.unmount());

		expect(subscribes - unsubscribes).toBe(0);
	});

	it("does not subscribe at all when an ability prop bypasses the store", () => {
		subscribes = 0;
		unsubscribes = 0;

		const { Can } = createVetoContext(ac);
		const ability = { can: () => true } as never;

		const root = mount(
			createElement(Can, { ability, I: "read", a: "post" }, "y"),
		);
		act(() => root.unmount());

		expect(subscribes).toBe(0);
	});
});
