import { describe, expect, it } from "vitest";
import { RelationNotLoadedError } from "../../src/errors/index.js";
import { evaluateCondition } from "../../src/evaluation/condition.js";
import { markLoaded } from "../../src/evaluation/loaded.js";
import type { ConditionNode } from "../../src/model/index.js";

type User = { id: string; role: "admin" | "user" };
type Comment = { id: string; spam: boolean };

type Post = {
	authorId: string;
	status: "draft" | "published" | "archived";
	views: number;
	author?: User | null;
	comments?: Comment[];
};

const createPost = (overrides?: Partial<Post>): Post => ({
	authorId: "u1",
	status: "published",
	views: 120,
	...overrides,
});

const createPostWithRelations = (overrides?: Partial<Post>): Post => ({
	...createPost(),
	author: { id: "u1", role: "admin" },
	comments: [
		{ id: "c1", spam: false },
		{ id: "c2", spam: true },
	],
	...overrides,
});

const createPostWithNullRelation = (overrides?: Partial<Post>): Post => ({
	...createPost(),
	author: null,
	comments: [],
	...overrides,
});

describe("evaluateCondition", () => {
	describe("root instance safeguards", () => {
		it("fails closed (returns false) if the root instance is null or undefined", () => {
			const node: ConditionNode<Post> = {
				field: "views",
				op: "eq",
				value: 120,
			};

			// @ts-expect-error: simulate null arriving at runtime
			expect(evaluateCondition(node, null)).toBe(false);
			// @ts-expect-error: simulate undefined arriving at runtime
			expect(evaluateCondition(node, undefined)).toBe(false);
		});
	});

	describe("logical combinators edge cases", () => {
		it("evaluates empty 'and' array to true (Vacuous Truth)", () => {
			expect(evaluateCondition({ and: [] }, createPost())).toBe(true);
		});

		it("evaluates empty 'or' array to false", () => {
			expect(evaluateCondition({ or: [] }, createPost())).toBe(false);
		});
	});

	describe("field node (additional cases)", () => {
		it("handles undefined properties gracefully", () => {
			const partialPost = { status: "published" } as Post;
			expect(
				evaluateCondition<Post>(
					{ field: "views", op: "eq", value: 100 },
					partialPost,
				),
			).toBe(false);
		});
	});

	describe("not (additional cases)", () => {
		it("handles double negation correctly", () => {
			expect(
				evaluateCondition<Post>(
					{ not: { not: { field: "status", op: "eq", value: "published" } } },
					createPost(),
				),
			).toBe(true);
		});
	});

	describe("relation", () => {
		describe("1. Happy Path (Valid Data & Logical Combinators)", () => {
			it("evaluates 'one' relation correctly", () => {
				const node: ConditionNode<Post> = {
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				};
				expect(evaluateCondition(node, createPostWithRelations())).toBe(true);

				const nodeFalse: ConditionNode<Post> = {
					...node,
					where: { field: "role", op: "eq", value: "user" },
				};
				expect(evaluateCondition(nodeFalse, createPostWithRelations())).toBe(
					false,
				);
			});

			it("evaluates 'many' relation with 'some' match", () => {
				const node: ConditionNode<Post> = {
					relation: "comments",
					type: "many",
					match: "some",
					where: { field: "spam", op: "eq", value: true },
				};
				expect(evaluateCondition(node, createPostWithRelations())).toBe(true);

				const nodeFalse: ConditionNode<Post> = {
					...node,
					where: { field: "id", op: "eq", value: "c99" },
				};
				expect(evaluateCondition(nodeFalse, createPostWithRelations())).toBe(
					false,
				);
			});

			it("evaluates 'many' relation with 'every' match", () => {
				const node: ConditionNode<Post> = {
					relation: "comments",
					type: "many",
					match: "every",
					where: { field: "spam", op: "eq", value: false },
				};
				expect(evaluateCondition(node, createPostWithRelations())).toBe(false);
			});

			it("evaluates 'many' relation with 'none' match", () => {
				const node: ConditionNode<Post> = {
					relation: "comments",
					type: "many",
					match: "none",
					where: { field: "id", op: "eq", value: "c99" },
				};
				expect(evaluateCondition(node, createPostWithRelations())).toBe(true);
			});

			it("evaluates relations nested inside logical combinators", () => {
				const node: ConditionNode<Post> = {
					and: [
						{ field: "status", op: "eq", value: "published" },
						{
							relation: "comments",
							type: "many",
							match: "some",
							where: { field: "spam", op: "eq", value: true },
						},
					],
				};
				expect(evaluateCondition(node, createPostWithRelations())).toBe(true);
			});

			it("evaluates a relation nested inside another relation's where (AST Recursion)", () => {
				type Workspace = { id: string };
				type Blog = { workspace?: Workspace | null };
				type PostWithBlog = { blog?: Blog | null };

				const instance: PostWithBlog = { blog: { workspace: { id: "w9" } } };
				const node: ConditionNode<PostWithBlog> = {
					relation: "blog",
					type: "one",
					where: {
						relation: "workspace",
						type: "one",
						where: { field: "id", op: "eq", value: "w9" },
					},
				};

				expect(evaluateCondition(node, instance)).toBe(true);
			});
		});

		describe("2. Fail-Fast (Level 2: Catching Missing JOINs)", () => {
			const node: ConditionNode<Post> = {
				relation: "comments",
				type: "many",
				match: "some",
				where: { field: "spam", op: "eq", value: true },
			};

			it("throws RelationNotLoadedError when relation is completely undefined", () => {
				expect(() => evaluateCondition(node, createPost())).toThrow(
					RelationNotLoadedError,
				);
			});

			it("carries the relation name on RelationNotLoadedError for audit", () => {
				expect(() => evaluateCondition(node, createPost())).toThrowError(
					expect.objectContaining({ relation: "comments" }),
				);
			});

			it("throws when relation is an array of foreign keys (Numbers)", () => {
				// @ts-expect-error: simulate a DB loading error (foreign keys instead of objects)
				const fkArray = createPost({ comments: [1, 2, 3] });
				expect(() => evaluateCondition(node, fkArray)).toThrow(
					RelationNotLoadedError,
				);
			});

			it("throws when relation is an array of foreign keys (Strings)", () => {
				// @ts-expect-error
				const fkArray = createPost({ comments: ["c1", "c2"] });
				expect(() => evaluateCondition(node, fkArray)).toThrow(
					RelationNotLoadedError,
				);
			});

			it("throws RelationNotLoadedError when relation array contains a mix of valid objects and garbage", () => {
				const mixedGarbage = createPost({
					// @ts-expect-error a mix of an object and a foreign key (loading error)
					comments: [{ id: "c1", spam: false }, 123],
				});
				expect(() => evaluateCondition(node, mixedGarbage)).toThrowError(
					expect.objectContaining({ relation: "comments" }),
				);
			});

			it("throws when to-one relation is a raw foreign key instead of object", () => {
				const toOneNode: ConditionNode<Post> = {
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				};
				// @ts-expect-error author as a raw FK (string) instead of an object
				const rawFk = createPost({ author: "u1" });
				expect(() => evaluateCondition(toOneNode, rawFk)).toThrow(
					RelationNotLoadedError,
				);
			});
		});

		describe("3. Fail-Closed & Trojan Horse Protection (Level 3: Handling DB Garbage)", () => {
			const denySpamNode: ConditionNode<Post> = {
				relation: "comments",
				type: "many",
				match: "none",
				where: { field: "spam", op: "eq", value: true },
			};

			it("returns undefined (not a silent false) if a Trojan Horse element is present in the array", () => {
				const dirtyInstance = createPost({
					comments: [
						{ id: "c1", spam: false },
						// @ts-expect-error null — garbage inside the array (dirty DB)
						null,
					],
				});

				expect(evaluateCondition(denySpamNode, dirtyInstance)).toBeUndefined();
			});

			it("returns undefined for a completely garbage relation object (not an array/object)", () => {
				const garbageInstance = createPost({
					// @ts-expect-error a Date instead of the comments array (garbage)
					comments: new Date(),
				});
				expect(
					evaluateCondition(denySpamNode, garbageInstance),
				).toBeUndefined();
			});

			const toOneAdminNode: ConditionNode<Post> = {
				relation: "author",
				type: "one",
				where: { field: "role", op: "eq", value: "admin" },
			};

			it("returns undefined when a to-one relation is delivered as an array (cardinality violation)", () => {
				const arrayAsToOne = createPost({
					// @ts-expect-error author as an array instead of one object — cardinality violation
					author: [
						{ id: "u2", role: "user" },
						{ id: "u1", role: "admin" },
					],
				});
				expect(evaluateCondition(toOneAdminNode, arrayAsToOne)).toBeUndefined();
			});

			it("still evaluates a well-formed single-object to-one normally", () => {
				expect(
					evaluateCondition(
						toOneAdminNode,
						createPost({ author: { id: "u1", role: "admin" } }),
					),
				).toBe(true);
				expect(
					evaluateCondition(
						toOneAdminNode,
						createPost({ author: { id: "u2", role: "user" } }),
					),
				).toBe(false);
			});

			it("returns undefined for a quantifier it does not recognise", () => {
				const node = {
					relation: "comments",
					type: "many",
					match: "most",
					where: { field: "spam", op: "eq", value: true },
				} as unknown as ConditionNode<Post>;

				expect(
					evaluateCondition(
						node,
						createPost({ comments: [{ id: "c1", spam: true }] }),
					),
				).toBeUndefined();
			});
		});

		describe("4. Vacuous Truths (Empty Collections)", () => {
			const makeNode = (
				match: "some" | "every" | "none",
			): ConditionNode<Post> => ({
				relation: "comments",
				type: "many",
				match,
				where: { field: "spam", op: "eq", value: true },
			});

			it("resolves empty arrays mathematically correct", () => {
				const nullRel = createPostWithNullRelation();
				expect(evaluateCondition(makeNode("some"), nullRel)).toBe(false);
				expect(evaluateCondition(makeNode("every"), nullRel)).toBe(true);
				expect(evaluateCondition(makeNode("none"), nullRel)).toBe(true);
			});

			it("resolves null relations mathematically correct (treats as empty collection)", () => {
				// @ts-expect-error: force null instead of an array
				const nullPost = createPost({ comments: null });
				expect(evaluateCondition(makeNode("some"), nullPost)).toBe(false);
				expect(evaluateCondition(makeNode("every"), nullPost)).toBe(true);
				expect(evaluateCondition(makeNode("none"), nullPost)).toBe(true);
			});

			it("handles null in to-one relation safely", () => {
				const toOneNode: ConditionNode<Post> = {
					relation: "author",
					type: "one",
					where: { field: "role", op: "eq", value: "admin" },
				};
				expect(evaluateCondition(toOneNode, createPostWithNullRelation())).toBe(
					false,
				);
			});
		});

		describe("markLoaded — explicit load marker", () => {
			const node: ConditionNode<Post> = {
				relation: "comments",
				type: "many",
				match: "some",
				where: { field: "spam", op: "eq", value: true },
			};

			it("treats a marked-loaded null relation as empty (no throw)", () => {
				const marked = markLoaded(createPost(), "comments", null);
				expect(() => evaluateCondition(node, marked)).not.toThrow();
				expect(evaluateCondition(node, marked)).toBe(false);
			});

			it("markLoaded rejects an undefined value", () => {
				expect(() => markLoaded(createPost(), "comments", undefined)).toThrow(
					/null/,
				);
			});

			it("still throws for an unmarked undefined relation", () => {
				expect(() => evaluateCondition(node, createPost())).toThrow(
					RelationNotLoadedError,
				);
			});
		});
	});
});
