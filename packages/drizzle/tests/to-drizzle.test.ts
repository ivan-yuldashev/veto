import { PGlite } from "@electric-sql/pglite";
import {
	buildAbility,
	type CheckedRules,
	type ConditionNode,
	createRules,
	defineAbilities,
	type Rule,
	shape,
} from "@vetojs/core";
import { sql } from "drizzle-orm";
import {
	customType,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { toDrizzle } from "../src/compile.js";

type Post = {
	id: string;
	authorId: string | null;
	status: string | null;
	views: number | null;
	publishedAt: Date | null;
	tag: string | null;
	labels: string[] | null;
};

const uppercaseText = customType<{ data: string; driverData: string }>({
	dataType: () => "text",
	toDriver: (value) => value.toUpperCase(),
	fromDriver: (value) => value.toLowerCase(),
});

const ac = defineAbilities({
	resources: {
		post: { schema: shape<Post>(), actions: ["read"] },
	},
});
const { allow, deny } = createRules(ac);

const posts = pgTable("posts", {
	id: text("id").primaryKey(),
	authorId: text("author_id"),
	status: text("status"),
	views: integer("views"),
	publishedAt: timestamp("published_at", { withTimezone: true }),
	tag: uppercaseText("tag"),
	labels: text("labels").array(),
});

const rows: Post[] = [
	{
		id: "published",
		authorId: "u1",
		status: "published",
		views: 200,
		publishedAt: new Date("2026-01-01T00:00:00Z"),
		tag: "alpha",
		labels: ["alpha", "beta"],
	},
	{
		id: "draft",
		authorId: "u2",
		status: "draft",
		views: 10,
		publishedAt: new Date("2026-06-01T00:00:00Z"),
		tag: "beta",
		labels: ["beta"],
	},
	{
		id: "null-status",
		authorId: "u1",
		status: null,
		views: 50,
		publishedAt: null,
		tag: null,
		labels: [],
	},
	{
		id: "null-views",
		authorId: "u2",
		status: "published",
		views: null,
		publishedAt: new Date("2025-01-01T00:00:00Z"),
		tag: null,
		labels: null,
	},
	{
		id: "null-author",
		authorId: null,
		status: "archived",
		views: 1000,
		publishedAt: null,
		tag: null,
		labels: ["gamma"],
	},
];

const client = new PGlite();
const db = drizzle(client);

beforeAll(async () => {
	await db.execute(sql`
		create table posts (
			id text primary key,
			author_id text,
			status text,
			views integer,
			published_at timestamptz,
			tag text,
			labels text[]
		)
	`);
	await db.insert(posts).values(rows);
});

afterAll(async () => {
	await client.close();
});

const expectIdentity = async (rules: Rule[]): Promise<string[]> => {
	const ability = buildAbility(ac, rules as CheckedRules);
	const engineVisible = rows
		.filter((row) => ability.can("read", "post", row))
		.map((row) => row.id)
		.sort();

	const filter = toDrizzle(ability.where("read", "post"), posts);
	const selected = await db.select({ id: posts.id }).from(posts).where(filter);
	const sqlVisible = selected.map((row) => row.id).sort();

	expect(sqlVisible).toEqual(engineVisible);
	return sqlVisible;
};

describe("toDrizzle — conformance with the engine (identity over a NULL grid)", () => {
	it("eq: NULL is a decidable non-match", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { status: { eq: "published" } } }),
		]);
		expect(visible).toEqual(["null-views", "published"]);
	});

	it("ne: a NULL row IS distinct from the value", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { status: { ne: "published" } } }),
		]);
		expect(visible).toContain("null-status");
	});

	it("in: membership over a list", async () => {
		await expectIdentity([
			allow("read", "post", {
				where: { status: { in: ["draft", "archived"] } },
			}),
		]);
	});

	it("has: element membership, NULL and empty arrays excluded", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { labels: { has: "beta" } } }),
		]);
		expect(visible).toEqual(["draft", "published"]);
	});

	it("hasAny: intersection with the list", async () => {
		const visible = await expectIdentity([
			allow("read", "post", {
				where: { labels: { hasAny: ["alpha", "gamma"] } },
			}),
		]);
		expect(visible).toEqual(["null-author", "published"]);
	});

	it("hasAll: superset of the list", async () => {
		const visible = await expectIdentity([
			allow("read", "post", {
				where: { labels: { hasAll: ["alpha", "beta"] } },
			}),
		]);
		expect(visible).toEqual(["published"]);
	});

	it("hasAll of an empty list is vacuously true", async () => {
		await expectIdentity([
			allow("read", "post", { where: { labels: { hasAll: [] } } }),
		]);
	});

	it("a deny through has survives the negation — the case a silent FALSE would break", async () => {
		const visible = await expectIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { labels: { has: "beta" } } }),
		]);
		expect(visible).not.toContain("published");
		expect(visible).not.toContain("draft");
		expect(visible).toContain("null-views");
	});

	it("nin: a NULL row is not in the list (total negation)", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { status: { nin: ["published"] } } }),
		]);
		expect(visible).toContain("null-status");
	});

	it("gt / lte: NULL never satisfies ordering", async () => {
		await expectIdentity([
			allow("read", "post", { where: { views: { gt: 100 } } }),
		]);
		await expectIdentity([
			allow("read", "post", { where: { views: { lte: 50 } } }),
		]);
	});

	it("contains: substring match, NULL decidably out", async () => {
		await expectIdentity([
			allow("read", "post", { where: { status: { contains: "publ" } } }),
		]);
	});

	it("exists: true → IS NOT NULL, false → IS NULL", async () => {
		await expectIdentity([
			allow("read", "post", { where: { authorId: { exists: true } } }),
		]);
		await expectIdentity([
			allow("read", "post", { where: { authorId: { exists: false } } }),
		]);
	});

	it("eq on a NOT NULL column takes the plain = fast path and stays conformant", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { id: { eq: "draft" } } }),
		]);
		expect(visible).toEqual(["draft"]);
	});

	it("params bind through the column encoder (transforming customType)", async () => {
		const visible = await expectIdentity([
			allow("read", "post", { where: { tag: { eq: "alpha" } } }),
		]);
		expect(visible).toEqual(["published"]);

		const visibleIn = await expectIdentity([
			allow("read", "post", { where: { tag: { in: ["alpha", "beta"] } } }),
		]);
		expect(visibleIn).toEqual(["draft", "published"]);
	});

	it("Date value round-trips through the epoch-ms rule encoding", async () => {
		const visible = await expectIdentity([
			allow("read", "post", {
				where: { publishedAt: { gt: new Date("2025-06-01T00:00:00Z") } },
			}),
		]);
		expect(visible).toEqual(["draft", "published"]);
	});

	it("allow + conditional deny: deny does not fire on a NULL row", async () => {
		const visible = await expectIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { views: { gt: 100 } } }),
		]);
		expect(visible).toContain("null-views");
	});

	it("unconditional allow collapses to NOT(deny)", async () => {
		await expectIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { status: { eq: "archived" } } }),
		]);
	});

	it("no allow → nothing is visible", async () => {
		const visible = await expectIdentity([]);
		expect(visible).toEqual([]);
	});

	it("nested or / not with sibling AND", async () => {
		await expectIdentity([
			allow("read", "post", {
				where: {
					or: [
						{ authorId: "u1", views: { gt: 100 } },
						{ not: { status: { eq: "draft" } } },
					],
				},
			}),
		]);
	});
});

describe("toDrizzle — loud failures instead of a silently wrong filter", () => {
	it("throws on a relation node (EXISTS is a follow-up)", () => {
		const node = {
			relation: "comments",
			type: "many" as const,
			match: "some" as const,
			where: { field: "spam", op: "eq" as const, value: true },
		};
		expect(() => toDrizzle(node, posts)).toThrow(/relation "comments"/);
	});

	it("throws on an unknown column", () => {
		expect(() =>
			toDrizzle({ field: "nope", op: "eq", value: 1 }, posts),
		).toThrow(/column "nope"/);
	});

	it("throws on a non-array in/nin (engine verdict is data-independent UNKNOWN)", () => {
		expect(() =>
			toDrizzle({ field: "status", op: "in", value: "draft" }, posts),
		).toThrow(/operator "in" on column "status" requires an array/);
	});

	it("throws on a non-scalar operator value", () => {
		expect(() =>
			toDrizzle({ field: "status", op: "eq", value: { nested: true } }, posts),
		).toThrow(/operator "eq" on column "status" got a non-scalar value/);
	});
});

describe("toDrizzle — edge semantics", () => {
	it("empty in-list matches nothing; nin over it matches everything", async () => {
		const empty: string[] = [];
		const visibleIn = await expectIdentity([
			allow("read", "post", { where: { status: { in: empty } } }),
		]);
		expect(visibleIn).toEqual([]);

		const visibleNin = await expectIdentity([
			allow("read", "post", { where: { status: { nin: empty } } }),
		]);
		expect(visibleNin).toHaveLength(rows.length);
	});

	it("a null member in the in-list matches exactly the NULL rows", async () => {
		const rules: Rule[] = [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: { field: "status", op: "in", value: ["draft", null] },
			},
		];
		const visible = await expectIdentity(rules);
		expect(visible).toEqual(["draft", "null-status"]);
	});

	it("a null rule value selects exactly the NULL rows, on both polarities", async () => {
		const isEmpty = await expectIdentity([
			allow("read", "post", { where: { status: { eq: null } } }),
		]);
		expect(isEmpty).toEqual(["null-status"]);

		const isSet = await expectIdentity([
			allow("read", "post", { where: { status: { ne: null } } }),
		]);
		expect(isSet).toEqual(["draft", "null-author", "null-views", "published"]);
	});

	it("a deny on a null rule value survives the negation", async () => {
		const visible = await expectIdentity([
			allow("read", "post"),
			deny("read", "post", { where: { status: { eq: null } } }),
		]);
		expect(visible).toEqual([
			"draft",
			"null-author",
			"null-views",
			"published",
		]);
	});

	it("an empty hasAny matches nothing, an empty hasAll asks nothing", async () => {
		const empty: string[] = [];

		expect(
			await expectIdentity([
				allow("read", "post", { where: { labels: { hasAny: empty } } }),
			]),
		).toEqual([]);

		expect(
			await expectIdentity([
				allow("read", "post", { where: { labels: { hasAll: empty } } }),
			]),
		).toEqual(["draft", "null-status", "null-author", "published"].sort());
	});

	it("contains against a non-string rule value matches nothing, as in the engine", async () => {
		const rules: Rule[] = [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: { field: "status", op: "contains", value: 42 },
			},
		];
		expect(await expectIdentity(rules)).toEqual([]);
	});

	it("throws on a membership list that is not a list, or carries a null", () => {
		for (const op of ["hasAny", "hasAll"] as const) {
			expect(() =>
				toDrizzle({ field: "labels", op, value: "alpha" as never }, posts),
			).toThrow(/requires an array value/);

			expect(() =>
				toDrizzle({ field: "labels", op, value: ["alpha", null] }, posts),
			).toThrow(/null member/);
		}

		expect(() =>
			toDrizzle({ field: "labels", op: "has", value: null }, posts),
		).toThrow(/null member/);
	});

	it("an unrecognised operator is refused even where the type check could answer", () => {
		const node = {
			field: "status",
			op: "bogus",
			value: 1,
		} as unknown as ConditionNode<Record<string, unknown>>;

		expect(() => toDrizzle(node, posts)).toThrow(/has no SQL translation/);
	});

	it("an unrecognised operator the type check cannot decide is refused, not guessed", () => {
		const node = {
			field: "status",
			op: "bogus",
			value: "draft",
		} as unknown as ConditionNode<Record<string, unknown>>;

		expect(() => toDrizzle(node, posts)).toThrow(/has no SQL translation/);
	});

	describe("scalar type-mismatch mirrors the engine (no coercion leak)", () => {
		const raw = (field: string, op: string, value: unknown): Rule[] => [
			{
				effect: "allow",
				action: "read",
				resource: "post",
				where: { field, op: op as never, value },
			},
		];

		it("eq: string value against an int column matches nothing (engine ===)", async () => {
			expect(await expectIdentity(raw("views", "eq", "200"))).toEqual([]);
		});

		it("eq: number value against a text column matches nothing", async () => {
			expect(await expectIdentity(raw("status", "eq", 200))).toEqual([]);
		});

		it("ne: string value against an int column matches everything", async () => {
			const visible = await expectIdentity(raw("views", "ne", "200"));
			expect(visible.length).toBeGreaterThan(0);
		});

		it("gt: string value against an int column is undecidable → nothing", async () => {
			expect(await expectIdentity(raw("views", "gt", "100"))).toEqual([]);
		});

		it("contains against a non-text (int) column matches nothing", async () => {
			expect(await expectIdentity(raw("views", "contains", "0"))).toEqual([]);
		});

		it("in: a type-mismatched member never matches (mixed list)", async () => {
			const visible = await expectIdentity(raw("views", "in", [200, "10"]));
			expect(visible).not.toContain("draft");
		});

		it("contains: a non-string rule value is decidably false, as in the engine", async () => {
			expect(await expectIdentity(raw("views", "contains", 0))).toEqual([]);
		});

		it("ne on a NOT NULL column keeps every other row", async () => {
			const visible = await expectIdentity(raw("id", "ne", "draft"));
			expect(visible).not.toContain("draft");
			expect(visible).toHaveLength(rows.length - 1);
		});
	});

	it("LIKE metacharacters in contains are matched literally", async () => {
		await db.insert(posts).values({
			id: "percent",
			authorId: "u3",
			status: "100%_done",
			views: 1,
			publishedAt: null,
			tag: null,
			labels: null,
		});
		rows.push({
			id: "percent",
			authorId: "u3",
			status: "100%_done",
			views: 1,
			publishedAt: null,
			tag: null,
			labels: null,
		});

		const visible = await expectIdentity([
			allow("read", "post", { where: { status: { contains: "%_" } } }),
		]);
		expect(visible).toEqual(["percent"]);
	});
});
