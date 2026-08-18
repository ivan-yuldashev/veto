import { buildAbility, createRules, defineAbilities, type } from "@vetojs/core";
import { eq } from "drizzle-orm";
import { boolean, integer, pgTable, text } from "drizzle-orm/pg-core";
import { it } from "vitest";
import { defineTables } from "../src/schema.js";

type Post = {
	id: string;
	authorId: string;
	views: number;
	featured: boolean;
	title: string;
};
type User = { id: string; role: string };

const ac = defineAbilities({
	resources: {
		post: {
			schema: type<Post>(),
			actions: ["read", "update"],
			relations: { author: { resource: "user", kind: "one" } },
		},
		user: { schema: type<User>(), actions: ["read"] },
	},
});
const { allow } = createRules(ac);

const posts = pgTable("posts", {
	id: text("id").primaryKey(),
	authorId: text("author_id"),
	views: integer("views"),
	featured: boolean("featured"),
	title: text("title"),
});
const users = pgTable("users", {
	id: text("id").primaryKey(),
	role: text("role"),
});

it("type guarantees (checked by tsc)", () => {
	// @ts-expect-error unknown action
	allow("archive", "post");
	// @ts-expect-error unknown resource
	allow("read", "comment");
	// @ts-expect-error unknown field in where
	allow("read", "post", { where: { bogus: { eq: 1 } } });
	// @ts-expect-error wrong value type (views is number)
	allow("read", "post", { where: { views: { eq: "ten" } } });
	// @ts-expect-error contains is string-only
	allow("read", "post", { where: { views: { contains: "x" } } });
	// @ts-expect-error gt is numeric-only (title is string)
	allow("read", "post", { where: { title: { gt: 5 } } });
	// @ts-expect-error unknown payload field
	allow("update", "post", { payload: { fields: ["bogus"] } });
	// @ts-expect-error relation key used as a field
	allow("read", "post", { where: { author: { eq: 1 } } });
	// @ts-expect-error unknown field inside a relation where
	allow("read", "post", { where: { author: { bogus: { eq: 1 } } } });

	defineTables(
		ac,
		{ post: posts, user: users },
		{
			// @ts-expect-error posts (parent) has no `role` column
			post: { author: (p, a) => eq(a.id, p.role) },
		},
	);
	defineTables(
		ac,
		{ post: posts, user: users },
		{
			// @ts-expect-error users (child) has no `views` column
			post: { author: (p, a) => eq(a.views, p.authorId) },
		},
	);
	// @ts-expect-error missing resource->table mapping (user)
	defineTables(ac, { post: posts }, {});

	// @ts-expect-error wrong table wired to a resource (post -> users table, user -> posts table)
	defineTables(ac, { post: users, user: posts }, {});

	const schema = defineTables(ac, { post: posts, user: users });
	const ability = buildAbility(ac, [allow("read", "post")]);
	schema.filter("post", ability.where("read", "post"));
	schema.filter(ability, "read", "post");
	// @ts-expect-error a condition compiled for another resource cannot filter posts
	schema.filter("post", ability.where("read", "user"));
	// @ts-expect-error unknown action in the ability form
	schema.filter(ability, "archive", "post");
});

it("takes the caller's own predicates and stays SQL", () => {
	const schema = defineTables(ac, { post: posts, user: users });
	const ability = buildAbility(ac, [allow("read", "post")]);

	schema.filter(ability, "read", "post", eq(posts.id, "p1"));
	schema.filter(
		ability,
		"read",
		"post",
		eq(posts.id, "p1"),
		eq(posts.views, 1),
	);
	schema.filter("post", ability.where("read", "post"), eq(posts.id, "p1"));

	// @ts-expect-error a narrowing predicate is SQL, not a condition shorthand
	schema.filter(ability, "read", "post", { id: "p1" });
});
