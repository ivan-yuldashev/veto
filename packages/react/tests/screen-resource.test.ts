/** @vitest-environment jsdom */

import { createRules, defineAbilities, shape } from "@vetojs/core";
import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createVetoContext } from "../src/context.js";

(
	globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const ac = defineAbilities({
	resources: {
		analytics: {
			schema: shape<{ workspaceId: string }>(),
			actions: ["view"],
		},
	},
});

const { allow, deny } = createRules(ac);
const { AbilityProvider, Can, useCan } = createVetoContext(ac);

const rules = [
	allow("view", "analytics", { where: { workspaceId: { in: ["w1"] } } }),
	deny("view", "analytics", { where: { workspaceId: "w9" } }),
];

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

const screen = (workspaceId?: string) =>
	createElement(
		AbilityProvider,
		{ rules },
		createElement(
			Can,
			{
				I: "view",
				a: "analytics",
				fallback: "Forbidden",
				...(workspaceId === undefined ? {} : { this: { workspaceId } }),
			},
			"Analytics",
		),
	);

describe("a resource that exists only to gate the interface", () => {
	it("shows the screen for a workspace the rule names", () => {
		render(screen("w1"));
		expect(container.textContent).toBe("Analytics");
	});

	it("hides the screen for a workspace the rule does not name", () => {
		render(screen("w2"));
		expect(container.textContent).toBe("Forbidden");
	});

	it("obeys a deny for one workspace while the blanket allow stands", () => {
		render(screen("w9"));
		expect(container.textContent).toBe("Forbidden");
	});

	it("renders without `this`, because the row-less check is optimistic", () => {
		render(screen());
		expect(container.textContent).toBe("Analytics");
	});

	it("answers per workspace when the route parameter changes", () => {
		render(screen("w1"));
		expect(container.textContent).toBe("Analytics");

		render(screen("w2"));
		expect(container.textContent).toBe("Forbidden");
	});

	it("gives a hook the same answer as the component", () => {
		const Probe = ({ workspaceId }: { workspaceId: string }) =>
			createElement(
				"span",
				null,
				useCan("view", "analytics", { workspaceId }) ? "yes" : "no",
			);

		render(
			createElement(
				AbilityProvider,
				{ rules },
				createElement(Probe, { workspaceId: "w2" }),
			),
		);

		expect(container.textContent).toBe("no");
	});
});
