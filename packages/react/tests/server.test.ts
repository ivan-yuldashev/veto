import { buildAbility, createRules, defineAbilities, type } from "@vetojs/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Can } from "../src/server.js";

type Post = { id: string; authorId: string };

const ac = defineAbilities({
	resources: {
		post: { schema: type<Post>(), actions: ["read", "update"] },
	},
});

const { allow } = createRules(ac);
const ability = buildAbility(ac, [
	allow("read", "post"),
	allow("update", "post", { where: { authorId: "u1" } }),
]);

const own: Post = { id: "p1", authorId: "u1" };
const other: Post = { id: "p2", authorId: "u2" };

const render = (node: Parameters<typeof renderToStaticMarkup>[0]) =>
	renderToStaticMarkup(node);

describe("server <Can>", () => {
	it("renders children with no provider anywhere", () => {
		const html = render(
			createElement(
				Can,
				{ ability, I: "update", a: "post", this: own },
				"EDIT",
			),
		);

		expect(html).toBe("EDIT");
	});

	it("renders the fallback when the row is not permitted", () => {
		const html = render(
			createElement(
				Can,
				{ ability, I: "update", a: "post", this: other, fallback: "READ-ONLY" },
				"EDIT",
			),
		);

		expect(html).toBe("READ-ONLY");
	});

	it("renders nothing when denied without a fallback", () => {
		const html = render(
			createElement(
				Can,
				{ ability, I: "update", a: "post", this: other },
				"EDIT",
			),
		);

		expect(html).toBe("");
	});

	it("answers the row-less question when no instance is given", () => {
		const html = render(
			createElement(Can, { ability, I: "update", a: "post" }, "SHOW"),
		);

		expect(html).toBe("SHOW");
	});

	it("falls back on a type-confused row, and the client binding agrees", async () => {
		const { createVetoContext } = await import("../src/context.js");
		const { AbilityProvider, Can: ClientCan } = createVetoContext(ac);
		const rules = [allow("update", "post", { where: { authorId: "u1" } })];
		const confused = { id: "p1", authorId: ["u1"] } as unknown as Post;

		const server = render(
			createElement(
				Can,
				{
					ability: buildAbility(ac, rules),
					I: "update",
					a: "post",
					this: confused,
					fallback: "READ-ONLY",
				},
				"EDIT",
			),
		);

		const client = renderToStaticMarkup(
			createElement(
				AbilityProvider,
				{ rules },
				createElement(
					ClientCan,
					{ I: "update", a: "post", this: confused, fallback: "READ-ONLY" },
					"EDIT",
				),
			),
		);

		expect(server).toBe("READ-ONLY");
		expect(client).toBe(server);
	});

	it("carries no client boundary — the module has no directive", async () => {
		const source = await import("node:fs/promises").then((fs) =>
			fs.readFile(new URL("../src/server.ts", import.meta.url), "utf8"),
		);

		expect(source).not.toContain("use client");
	});
});

describe("client bindings under server rendering", () => {
	it("renders the provider tree without a getServerSnapshot error", async () => {
		const { createVetoContext } = await import("../src/context.js");
		const { AbilityProvider, Can: ClientCan } = createVetoContext(ac);

		const html = renderToStaticMarkup(
			createElement(
				AbilityProvider,
				{ rules: [allow("update", "post", { where: { authorId: "u1" } })] },
				createElement(
					ClientCan,
					{ I: "update", a: "post", this: own, fallback: "NO" },
					"EDIT",
				),
			),
		);

		expect(html).toBe("EDIT");
	});

	it("agrees with the client on the first snapshot, so hydration matches", () => {
		const html = renderToStaticMarkup(
			createElement(
				Can,
				{ ability, I: "update", a: "post", this: other, fallback: "NO" },
				"EDIT",
			),
		);

		expect(html).toBe("NO");
	});
});
