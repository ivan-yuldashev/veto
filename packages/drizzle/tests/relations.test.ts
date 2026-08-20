import { PGlite } from "@electric-sql/pglite";
import {
	buildAbility,
	type CheckedRules,
	createRules,
	defineAbilities,
	type Rule,
	shape,
} from "@vetojs/core";
import { eq, sql } from "drizzle-orm";
import { type AnyPgColumn, boolean, pgTable, text } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDrizzle } from "../src/compile.js";
import { defineTables } from "../src/schema.js";

type User = { id: string; role: string | null; managerId: string | null };
type Post = { id: string; authorId: string | null; status: string };
type Comment = { id: string; postId: string; spam: boolean };

const ac = defineAbilities({
	resources: {
		user: {
			schema: shape<User>(),
			actions: ["read"],
			relations: { manager: { resource: "user", kind: "one" } },
		},
		post: {
			schema: shape<Post>(),
			actions: ["read"],
			relations: {
				author: { resource: "user", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		comment: { schema: shape<Comment>(), actions: ["read"] },
	},
});
const { allow, deny } = createRules(ac);

const users = pgTable("users", {
	id: text("id").primaryKey(),
	role: text("role"),
	managerId: text("manager_id"),
});
const posts = pgTable("posts", {
	id: text("id").primaryKey(),
	authorId: text("author_id"),
	status: text("status").notNull(),
});
const comments = pgTable("comments", {
	id: text("id").primaryKey(),
	postId: text("post_id").notNull(),
	spam: boolean("spam").notNull(),
});

const schema = defineTables(
	ac,
	{ user: users, post: posts, comment: comments },
	{
		user: { manager: (user, manager) => eq(manager.id, user.managerId) },
		post: {
			author: (post, author) => eq(author.id, post.authorId),
			comments: (post, comment) => eq(comment.postId, post.id),
		},
	},
);

const userRows: User[] = [
	{ id: "boss", role: "admin", managerId: null },
	{ id: "lead", role: "editor", managerId: "boss" },
	{ id: "writer", role: null, managerId: "lead" },
];
const postRows: Post[] = [
	{ id: "by-lead", authorId: "lead", status: "published" },
	{ id: "by-writer", authorId: "writer", status: "draft" },
	{ id: "orphan", authorId: null, status: "published" },
];
const commentRows: Comment[] = [
	{ id: "c1", postId: "by-lead", spam: false },
	{ id: "c2", postId: "by-lead", spam: true },
	{ id: "c3", postId: "by-writer", spam: false },
];

const usersById = new Map(userRows.map((user) => [user.id, user]));

type ComposedUser = User & { manager: ComposedUser | null };

const composeUser = (user: User, depth: number): ComposedUser => {
	const manager =
		user.managerId === null ? undefined : usersById.get(user.managerId);

	return {
		...user,
		manager:
			manager === undefined || depth === 0
				? null
				: composeUser(manager, depth - 1),
	};
};

const composedUsers = userRows.map((user) => composeUser(user, 3));
const composedUsersById = new Map(composedUsers.map((user) => [user.id, user]));
const composedPosts = postRows.map((post) => ({
	...post,
	author:
		post.authorId === null
			? null
			: (composedUsersById.get(post.authorId) ?? null),
	comments: commentRows.filter((comment) => comment.postId === post.id),
}));

const client = new PGlite();
const db = drizzle(client);

beforeAll(async () => {
	await db.execute(sql`
		create table users (id text primary key, role text, manager_id text);
	`);
	await db.execute(sql`
		create table posts (id text primary key, author_id text, status text not null);
	`);
	await db.execute(sql`
		create table comments (id text primary key, post_id text not null, spam boolean not null);
	`);
	await db.insert(users).values(userRows);
	await db.insert(posts).values(postRows);
	await db.insert(comments).values(commentRows);
});

afterAll(async () => {
	await client.close();
});

const expectPostIdentity = async (rules: Rule[]): Promise<string[]> => {
	const ability = buildAbility(ac, rules as CheckedRules);
	const engineVisible = composedPosts
		.filter((post) => ability.can("read", "post", post))
		.map((post) => post.id)
		.sort();

	const filter = schema.filter("post", ability.where("read", "post"));
	const selected = await db.select({ id: posts.id }).from(posts).where(filter);
	const sqlVisible = selected.map((row) => row.id).sort();

	expect(sqlVisible).toEqual(engineVisible);
	return sqlVisible;
};

describe("defineTables — relation conformance (EXISTS ≡ engine)", () => {
	it("refuses an unrecognised quantifier instead of guessing none", async () => {
		const rules = [
			allow("read", "post"),
			{
				effect: "deny",
				action: "read",
				resource: "post",
				where: {
					relation: "comments",
					type: "many",
					match: "most",
					where: { field: "spam", op: "eq", value: true },
				},
			},
		] as unknown as Rule[];
		const ability = buildAbility(ac, rules as CheckedRules);

		expect(
			composedPosts.filter((post) => ability.can("read", "post", post)),
		).toEqual([]);
		expect(() => schema.filter("post", ability.where("read", "post"))).toThrow(
			/quantifier "most"/,
		);
	});
	it("to-one: author.role, a NULL author is decidably out", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", { where: { author: { role: "editor" } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("to-many some", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", { where: { comments: { some: { spam: true } } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("to-many every: vacuous truth over a post without comments", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", {
				where: { comments: { every: { spam: false } } },
			}),
		]);
		expect(visible).toEqual(["by-writer", "orphan"]);
	});

	it("to-many none", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", { where: { comments: { none: { spam: true } } } }),
		]);
		expect(visible).toEqual(["by-writer", "orphan"]);
	});

	it("nested to-one: author.manager.role (self-alias on users)", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", {
				where: { author: { manager: { role: "admin" } } },
			}),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("deny through a relation compiles to NOT EXISTS", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { comments: { some: { spam: true } } } }),
		]);
		expect(visible).toEqual(["by-writer", "orphan"]);
	});

	it("relation mixed with a field (sibling AND)", async () => {
		await expectPostIdentity([
			allow("read", "post", {
				where: { status: "published", author: { role: "editor" } },
			}),
		]);
	});

	it("deny through every compiles to NOT(NOT EXISTS(NOT inner))", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { comments: { every: { spam: false } } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("deny through none compiles to NOT(NOT EXISTS)", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { comments: { none: { spam: true } } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("two same-target relations in one AND get distinct aliases", async () => {
		const visible = await expectPostIdentity([
			allow("read", "post", {
				where: {
					and: [
						{ comments: { some: { spam: true } } },
						{ comments: { some: { spam: false } } },
					],
				},
			}),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("a type-mismatched inner value fails closed through the subquery", async () => {
		const rules: Rule[] = [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: {
					relation: "comments",
					type: "many",
					match: "some",
					where: { field: "spam", op: "eq", value: "true" },
				},
			},
		];
		expect(await expectPostIdentity(rules)).toEqual([]);
	});

	it("a self-relation nested in itself gets one alias per level", async () => {
		const ability = buildAbility(ac, [
			allow("read", "user", {
				where: { manager: { manager: { role: "admin" } } },
			}),
		]);
		const engineVisible = composedUsers
			.filter((user) => ability.can("read", "user", user))
			.map((user) => user.id)
			.sort();

		const filter = schema.filter("user", ability.where("read", "user"));
		const selected = await db
			.select({ id: users.id })
			.from(users)
			.where(filter);
		expect(selected.map((row) => row.id).sort()).toEqual(engineVisible);
		expect(engineVisible).toEqual(["writer"]);
	});

	it("self to-one on the root resource", async () => {
		const ability = buildAbility(ac, [
			allow("read", "user", { where: { manager: { role: "admin" } } }),
		]);
		const engineVisible = composedUsers
			.filter((user) => ability.can("read", "user", user))
			.map((user) => user.id)
			.sort();

		const filter = schema.filter("user", ability.where("read", "user"));
		const selected = await db
			.select({ id: users.id })
			.from(users)
			.where(filter);
		expect(selected.map((row) => row.id).sort()).toEqual(engineVisible);
		expect(engineVisible).toEqual(["lead"]);
	});
});

describe("defineTables — phantom (table-less) resources", () => {
	const acWithPhantom = defineAbilities({
		resources: {
			post: { schema: shape<Post>(), actions: ["read"] },
			analytics: {
				schema: shape<{ workspaceId: string }>(),
				actions: ["view"],
			},
		},
	});

	const phantomSchema = defineTables(acWithPhantom, {
		post: posts,
		analytics: null,
	});

	it("filters real resources as usual", async () => {
		const { allow: allowPh } = createRules(acWithPhantom);
		const ability = buildAbility(acWithPhantom, [allowPh("read", "post")]);
		const selected = await db
			.select({ id: posts.id })
			.from(posts)
			.where(phantomSchema.filter("post", ability.where("read", "post")));
		expect(selected.length).toBeGreaterThan(0);
	});

	it("throws loudly when filtering a phantom resource", () => {
		const { allow: allowPh } = createRules(acWithPhantom);
		const ability = buildAbility(acWithPhantom, [allowPh("view", "analytics")]);
		expect(() =>
			phantomSchema.filter("analytics", ability.where("view", "analytics")),
		).toThrow(/phantom resource/);
	});
});

describe("defineTables — loud configuration failures", () => {
	it("throws when the join is neither configured nor derivable from FKs", () => {
		const bare = defineTables(ac, {
			user: users,
			post: posts,
			comment: comments,
		});
		const condition = buildAbility(ac, [
			allow("read", "post", { where: { author: { role: "admin" } } }),
		]).where("read", "post");
		expect(() => bare.filter("post", condition)).toThrow(
			/no join predicate for relation "author" of resource "post" \(no foreign key from "posts" to "users"\)/,
		);
	});

	it("throws when the filtered resource has no entry in the table map", () => {
		const partial = defineTables(ac, {
			user: users,
			post: posts,
			comment: comments,
		});
		const filterAny = partial.filter as (
			resource: string,
			condition: unknown,
		) => unknown;

		expect(() =>
			filterAny("ghost", { field: "id", op: "eq", value: "x" }),
		).toThrow(
			/the filtered resource is "ghost", which is not present in the defineTables table map/,
		);
	});

	it("throws when a relation targets a resource declared without a table", () => {
		const acPhantom = defineAbilities({
			resources: {
				post: {
					schema: shape<Post>(),
					actions: ["read"],
					relations: { author: { resource: "user", kind: "one" } },
				},
				user: {
					schema: shape<User>(),
					actions: ["read"],
					relations: { manager: { resource: "user", kind: "one" } },
				},
			},
		});
		const phantom = defineTables(acPhantom, { post: posts, user: null });
		const condition = buildAbility(acPhantom, [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: {
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				},
			},
		] as CheckedRules).where("read", "post");

		expect(() => phantom.filter("post", condition)).toThrow(
			/the target of relation "author" is the phantom resource "user"/,
		);
	});

	it("names the resource alongside the table when a column is missing", () => {
		const filterAny = schema.filter as (
			resource: string,
			condition: unknown,
		) => unknown;

		expect(() =>
			filterAny("post", { field: "nope", op: "eq", value: 1 }),
		).toThrow(
			/column "nope" does not exist in table "posts" \(resource "post"\)/,
		);
	});

	it("throws when a condition names a relation the registry does not declare", () => {
		const ghost = {
			relation: "ghost",
			type: "one",
			where: { field: "id", op: "eq", value: "x" },
		};
		const filterAny = schema.filter as (
			resource: string,
			condition: unknown,
		) => unknown;

		expect(() => filterAny("post", ghost)).toThrow(
			/relation "ghost" of resource "post" is not declared in the ability registry/,
		);
	});

	it("plain toDrizzle still rejects relation nodes with a pointer to defineTables", () => {
		const condition = buildAbility(ac, [
			allow("read", "post", { where: { author: { role: "admin" } } }),
		]).where("read", "post");
		expect(() => toDrizzle(condition, posts)).toThrow(/defineTables/);
	});
});

describe("defineTables — joins derived from FK metadata (.references())", () => {
	const fkUsers = pgTable("fk_users", {
		id: text("id").primaryKey(),
		role: text("role"),
		managerId: text("manager_id").references((): AnyPgColumn => fkUsers.id),
	});
	const fkPosts = pgTable("fk_posts", {
		id: text("id").primaryKey(),
		authorId: text("author_id").references(() => fkUsers.id),
		status: text("status").notNull(),
	});
	const fkComments = pgTable("fk_comments", {
		id: text("id").primaryKey(),
		postId: text("post_id")
			.notNull()
			.references(() => fkPosts.id),
		spam: boolean("spam").notNull(),
	});

	const derived = defineTables(ac, {
		user: fkUsers,
		post: fkPosts,
		comment: fkComments,
	});

	beforeAll(async () => {
		await db.execute(sql`
			create table fk_users (id text primary key, role text, manager_id text);
		`);
		await db.execute(sql`
			create table fk_posts (id text primary key, author_id text, status text not null);
		`);
		await db.execute(sql`
			create table fk_comments (id text primary key, post_id text not null, spam boolean not null);
		`);
		await db.insert(fkUsers).values(userRows);
		await db.insert(fkPosts).values(postRows);
		await db.insert(fkComments).values(commentRows);
	});

	const fkPostIdentity = async (rules: Rule[]): Promise<string[]> => {
		const ability = buildAbility(ac, rules as CheckedRules);
		const engineVisible = composedPosts
			.filter((post) => ability.can("read", "post", post))
			.map((post) => post.id)
			.sort();
		const selected = await db
			.select({ id: fkPosts.id })
			.from(fkPosts)
			.where(derived.filter(ability, "read", "post"));
		const sqlVisible = selected.map((row) => row.id).sort();
		expect(sqlVisible).toEqual(engineVisible);
		return sqlVisible;
	};

	it("to-one derived from the FK on the parent", async () => {
		const visible = await fkPostIdentity([
			allow("read", "post", { where: { author: { role: "editor" } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("to-many derived from the FK on the child", async () => {
		const visible = await fkPostIdentity([
			allow("read", "post", { where: { comments: { some: { spam: true } } } }),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("nested derivation: author.manager.role over a self-referencing FK", async () => {
		const visible = await fkPostIdentity([
			allow("read", "post", {
				where: { author: { manager: { role: "admin" } } },
			}),
		]);
		expect(visible).toEqual(["by-lead"]);
	});

	it("an explicit join overrides the derivable FK", async () => {
		const overridden = defineTables(
			ac,
			{ user: fkUsers, post: fkPosts, comment: fkComments },
			{ post: { comments: () => sql`false` } },
		);
		const ability = buildAbility(ac, [
			allow("read", "post", { where: { comments: { some: { spam: true } } } }),
		]);
		const selected = await db
			.select({ id: fkPosts.id })
			.from(fkPosts)
			.where(overridden.filter("post", ability.where("read", "post")));
		expect(selected).toEqual([]);
	});

	it("two FKs to the same target are ambiguous — the error demands an explicit join", () => {
		const fkReviews = pgTable("fk_reviews", {
			id: text("id").primaryKey(),
			authorId: text("author_id").references(() => fkUsers.id),
			editorId: text("editor_id").references(() => fkUsers.id),
		});
		const acReviews = defineAbilities({
			resources: {
				review: {
					schema: shape<{ id: string }>(),
					actions: ["read"],
					relations: { author: { resource: "user", kind: "one" } },
				},
				user: { schema: shape<User>(), actions: ["read"] },
			},
		});
		const { allow: allowReview } = createRules(acReviews);
		const reviewSchema = defineTables(acReviews, {
			review: fkReviews,
			user: fkUsers,
		});
		const ability = buildAbility(acReviews, [
			allowReview("read", "review", { where: { author: { role: "admin" } } }),
		]);
		expect(() => reviewSchema.filter(ability, "read", "review")).toThrow(
			/2 foreign keys from "fk_reviews" to "fk_users" — ambiguous/,
		);
	});
});

describe("defineTables — narrowing with the caller's own predicates", () => {
	it("intersects them with the policy instead of replacing it", async () => {
		const ability = buildAbility(ac, [
			allow("read", "post", { where: { status: "published" } }),
		]);

		const byPolicy = await db
			.select({ id: posts.id })
			.from(posts)
			.where(schema.filter(ability, "read", "post"));

		const narrowed = await db
			.select({ id: posts.id })
			.from(posts)
			.where(schema.filter(ability, "read", "post", eq(posts.id, "by-lead")));

		expect(byPolicy.map((row) => row.id).sort()).toEqual(["by-lead", "orphan"]);
		expect(narrowed.map((row) => row.id)).toEqual(["by-lead"]);
	});

	it("cannot reach a row the policy hides", async () => {
		const ability = buildAbility(ac, [
			allow("read", "post", { where: { status: "published" } }),
		]);

		const forbidden = await db
			.select({ id: posts.id })
			.from(posts)
			.where(schema.filter(ability, "read", "post", eq(posts.id, "by-writer")));

		expect(forbidden).toEqual([]);
	});

	it("takes several predicates, and a bare column reads as one", async () => {
		const ability = buildAbility(ac, [allow("read", "post")]);

		const selected = await db
			.select({ id: posts.id })
			.from(posts)
			.where(
				schema.filter(
					ability,
					"read",
					"post",
					eq(posts.status, "published"),
					eq(posts.authorId, "lead"),
				),
			);

		expect(selected.map((row) => row.id)).toEqual(["by-lead"]);
	});
});
