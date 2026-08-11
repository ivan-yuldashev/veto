/** @vitest-environment jsdom */

import { createRules, defineAbilities, type } from "@vetojs/core";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string; authorId: string };

const ac = defineAbilities({
	resources: { post: { schema: type<Post>(), actions: ["read", "update"] } },
});

const { allow } = createRules(ac);
const { AbilityProvider, useCan, useSetRules } = createVetoContext(ac);

const rows: Post[] = Array.from({ length: 50 }, (_, index) => ({
	id: `p${index}`,
	authorId: index === 7 ? "u1" : "u2",
}));

const asViewer = [allow("read", "post")];
const asEditor = [
	allow("read", "post"),
	allow("update", "post", { where: { authorId: "u1" } }),
];

describe("switching rules without re-rendering the tree", () => {
	it("touches only the rows whose verdict moved", () => {
		const container = document.createElement("div");
		document.body.append(container);
		const root: Root = createRoot(container);

		const counts = { gate: 0, plain: 0, provider: 0 };
		let promote: (() => void) | undefined;

		const Gate = ({ post }: { post: Post }) => {
			counts.gate += 1;
			return useCan("update", "post", post) ? "y" : "n";
		};

		const Plain = () => {
			counts.plain += 1;
			return null;
		};

		const Switcher = () => {
			const setRules = useSetRules();
			promote = () => setRules(asEditor);
			return null;
		};

		const App = () => {
			counts.provider += 1;
			return createElement(
				AbilityProvider,
				{ rules: asViewer },
				createElement(Switcher),
				...rows.map((post) => createElement(Gate, { key: post.id, post })),
				...rows.map((post) => createElement(Plain, { key: `x${post.id}` })),
			);
		};

		act(() => root.render(createElement(App)));

		counts.gate = 0;
		counts.plain = 0;
		counts.provider = 0;

		act(() => promote?.());

		expect(counts.provider).toBe(0);
		expect(counts.plain).toBe(0);
		expect(counts.gate).toBe(1);
		expect(container.textContent).toBe(
			`${"n".repeat(7)}y${"n".repeat(rows.length - 8)}`,
		);

		act(() => root.unmount());
	});
});
