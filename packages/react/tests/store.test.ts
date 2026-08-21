/** @vitest-environment jsdom */

import {
	buildAbility,
	createRules,
	defineAbilities,
	shape,
} from "@vetojs/core";
import { act, createElement, memo, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Post = { id: string; authorId: string };

const ac = defineAbilities({
	resources: { post: { schema: shape<Post>(), actions: ["read", "update"] } },
});

const { allow } = createRules(ac);
const { AbilityProvider, useAbility, useCan, Can } = createVetoContext(ac);

const rows: Post[] = Array.from({ length: 50 }, (_, index) => ({
	id: `p${index}`,
	authorId: index === 7 ? "u1" : "u2",
}));

const before = [allow("read", "post")];
const after = [
	allow("read", "post"),
	allow("update", "post", { where: { authorId: "u1" } }),
];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
	container = document.createElement("div");
	document.body.append(container);
	root = createRoot(container);
});

const mountList = (Gate: (props: { post: Post }) => unknown) => {
	const Row = memo(({ post }: { post: Post }) =>
		createElement(Gate as never, { post }),
	);
	const children = rows.map((post) =>
		createElement(Row, { key: post.id, post }),
	);

	let flip: (() => void) | undefined;
	const App = () => {
		const [rules, setRules] = useState(before);
		flip = () => setRules(after);
		return createElement(AbilityProvider, { rules }, ...children);
	};

	act(() => root.render(createElement(App)));
	return () => act(() => flip?.());
};

describe("fine-grained subscriptions", () => {
	it("re-renders only the row whose verdict flipped", () => {
		let renders = 0;
		const Gate = ({ post }: { post: Post }) => {
			renders += 1;
			return useCan("update", "post", post) ? "E" : "-";
		};

		const flip = mountList(Gate);
		renders = 0;
		flip();

		expect(renders).toBe(1);
	});

	it("<Can> rides the same subscription — its wrapper never re-renders", () => {
		let renders = 0;
		const Gate = ({ post }: { post: Post }) => {
			renders += 1;
			return createElement(
				Can,
				{ I: "update", a: "post", this: post, fallback: "-" },
				"E",
			);
		};

		const flip = mountList(Gate);
		expect(container.textContent).toBe("-".repeat(rows.length));

		renders = 0;
		flip();

		expect(renders).toBe(0);
		expect(container.textContent).toBe(
			`${"-".repeat(7)}E${"-".repeat(rows.length - 8)}`,
		);
	});

	it("useAbility still wakes on every change — it hands back the whole object", () => {
		let renders = 0;
		const Gate = ({ post }: { post: Post }) => {
			renders += 1;
			const ability = useAbility();
			return ability.can("update", "post", post) ? "E" : "-";
		};

		const flip = mountList(Gate);
		renders = 0;
		flip();

		expect(renders).toBe(rows.length);
	});

	it("keeps one store per provider, so sibling trees do not share", () => {
		const first = buildAbility(ac, [allow("update", "post")]);

		render(
			createElement(
				"div",
				null,
				createElement(
					AbilityProvider,
					{ ability: first },
					createElement(Can, { I: "update", a: "post" }, "A"),
				),
				createElement(
					AbilityProvider,
					{ rules: [] },
					createElement(Can, { I: "update", a: "post", fallback: "b" }, "B"),
				),
			),
		);

		expect(container.textContent).toBe("Ab");
	});
});

const render = (node: ReturnType<typeof createElement>) =>
	act(() => root.render(node));
