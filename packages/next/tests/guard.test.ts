import {
	createRules,
	defineAbilities,
	ForbiddenError,
	type,
} from "@vetojs/core";
import { describe, expect, it } from "vitest";
import { createGuard } from "../src/guard.js";

type Post = {
	id: string;
	authorId: string;
	status: "draft" | "published";
};

const ac = defineAbilities({
	resources: {
		post: {
			schema: type<Post>(),
			actions: ["read", "update"],
		},
	},
});

const { allow, deny } = createRules(ac);
const actor = { id: "u1" };

describe("createGuard", () => {
	it("runs the handler when a blanket read is allowed", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [allow("read", "post")],
		});
		const getPost = withPermission(
			{ action: "read", resource: "post" },
			async (ctx, id: string) => ({ id, by: ctx.actor.id }),
		);
		expect(await getPost("p1")).toEqual({ id: "p1", by: "u1" });
	});

	it("throws ForbiddenError when access is denied", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [],
		});
		const getPost = withPermission(
			{ action: "read", resource: "post" },
			async () => "ok",
		);
		await expect(getPost()).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("checks the instance against the rule's where", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("read", "post", { where: { authorId: { eq: "u1" } } }),
			],
		});
		const getOwn = withPermission(
			{
				action: "read",
				resource: "post",
				load: (row: Post) => row,
			},
			async (ctx) => ctx.row?.id,
		);
		expect(await getOwn({ id: "p1", authorId: "u1", status: "draft" })).toBe(
			"p1",
		);
		await expect(
			getOwn({ id: "p2", authorId: "u2", status: "draft" }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("denies when load resolves to no row instead of falling back to the row-less check", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("read", "post", { where: { authorId: { eq: "u1" } } }),
			],
		});
		const getMissing = withPermission(
			{
				action: "read",
				resource: "post",
				load: () => undefined as unknown as Post,
			},
			async (ctx) => ctx.row?.id,
		);

		await expect(getMissing()).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("denies when load resolves to something that is not a row", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [allow("read", "post")],
		});

		for (const value of ["p1", 42, null, [{ id: "p1" }]]) {
			const getOdd = withPermission(
				{
					action: "read",
					resource: "post",
					load: () => value as unknown as Post,
				},
				async (ctx) => ctx.row?.id,
			);

			await expect(getOdd()).rejects.toBeInstanceOf(ForbiddenError);
		}
	});

	it("lets a payload-scoped deny through the row-less path and settles it on the payload", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
				deny("update", "post", { payload: { fields: ["authorId"] } }),
			],
		});
		const updateNoLoad = withPermission(
			{
				action: "update",
				resource: "post",
				payload: (input: { data: Partial<Post> }) => input.data,
			},
			async (ctx) => ctx.payload,
		);

		expect(await updateNoLoad({ data: { status: "draft" } })).toEqual({
			status: "draft",
		});
		await expect(
			updateNoLoad({ data: { authorId: "u2" } }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("validates the payload and exposes it on ctx", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
			],
		});
		const updatePost = withPermission(
			{
				action: "update",
				resource: "post",
				load: (input: { id: string; data: Partial<Post> }) => ({
					id: input.id,
					authorId: "u1",
					status: "draft" as const,
				}),
				payload: (input) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		expect(
			await updatePost({ id: "p1", data: { status: "published" } }),
		).toEqual({ status: "published" });
	});

	it("denies a payload touching a non-permitted field", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
			],
		});
		const updatePost = withPermission(
			{
				action: "update",
				resource: "post",
				load: (input: { id: string; data: Partial<Post> }) => ({
					id: input.id,
					authorId: "u1",
					status: "draft" as const,
				}),
				payload: (input) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		await expect(
			updatePost({ id: "p1", data: { authorId: "hacked" } }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("fails closed on a payload mutation without load when a conditional deny matches", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
				deny("update", "post", { where: { status: { eq: "published" } } }),
			],
		});
		const updateNoLoad = withPermission(
			{
				action: "update",
				resource: "post",
				payload: (input: { data: Partial<Post> }) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		await expect(
			updateNoLoad({ data: { status: "draft" } }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("allows a payload mutation without load when no conditional deny matches", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
			],
		});
		const createStyle = withPermission(
			{
				action: "update",
				resource: "post",
				payload: (input: { data: Partial<Post> }) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		expect(await createStyle({ data: { status: "draft" } })).toEqual({
			status: "draft",
		});
	});

	it("exposes the validated copy on ctx.payload, not the raw input", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
			],
		});
		const updatePost = withPermission(
			{
				action: "update",
				resource: "post",
				load: (input: { id: string; data: Partial<Post> }) => ({
					id: input.id,
					authorId: "u1",
					status: "draft" as const,
				}),
				payload: (input) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		const data: Partial<Post> = { status: "published" };
		const result = await updatePost({ id: "p1", data });
		expect(result).toEqual(data);
		expect(result).not.toBe(data);
	});

	it("fails closed on a no-load mutation when an unconditional deny matches", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
				deny("update", "post"),
			],
		});
		const updateNoLoad = withPermission(
			{
				action: "update",
				resource: "post",
				payload: (input: { data: Partial<Post> }) => input.data,
			},
			async (ctx) => ctx.payload,
		);
		await expect(
			updateNoLoad({ data: { status: "published" } }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("denies a no-load mutation when the policy grants nothing", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [],
		});
		const updateNoLoad = withPermission(
			{
				action: "update",
				resource: "post",
				payload: (input: { data: Partial<Post> }) => input.data,
			},
			async (ctx) => ctx.payload,
		);

		await expect(updateNoLoad({ data: {} })).rejects.toBeInstanceOf(
			ForbiddenError,
		);
		await expect(
			updateNoLoad({ data: { status: "draft" } }),
		).rejects.toBeInstanceOf(ForbiddenError);
	});

	it("passes multiple action arguments through to load, payload and handler", async () => {
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [
				allow("update", "post", { payload: { fields: ["status"] } }),
			],
		});
		const updatePost = withPermission(
			{
				action: "update",
				resource: "post",
				load: (id: string, _data: Partial<Post>) => ({
					id,
					authorId: "u1",
					status: "draft" as const,
				}),
				payload: (_id, data) => data,
			},
			async (ctx, id, _data) => ({ id, status: ctx.payload?.status }),
		);
		expect(await updatePost("p1", { status: "published" })).toEqual({
			id: "p1",
			status: "published",
		});
	});

	it("routes denials through a custom onDeny", async () => {
		const seen: ForbiddenError[] = [];
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [],
			onDeny: (error) => {
				seen.push(error);
				throw error;
			},
		});
		const getPost = withPermission(
			{ action: "read", resource: "post" },
			async () => "ok",
		);
		await expect(getPost()).rejects.toBeInstanceOf(ForbiddenError);
		expect(seen).toHaveLength(1);
		expect(seen[0]?.action).toBe("read");
	});

	it("still denies when onDeny returns instead of throwing", async () => {
		const seen: ForbiddenError[] = [];
		const withPermission = createGuard({
			ac,
			getActor: () => actor,
			policy: () => [],
			onDeny: ((error: ForbiddenError) => {
				seen.push(error);
			}) as (error: ForbiddenError) => never,
		});
		const getPost = withPermission(
			{ action: "read", resource: "post" },
			async () => "ok",
		);

		await expect(getPost()).rejects.toBeInstanceOf(ForbiddenError);
		expect(seen).toHaveLength(1);
	});
});

describe("no actor signed in", () => {
	it("routes through onUnauthenticated when provided", async () => {
		const seen: string[] = [];
		const guard = createGuard({
			ac,
			getActor: () => null,
			policy: () => [],
			onUnauthenticated: () => {
				seen.push("401");
				throw new Error("unauthenticated");
			},
		});
		const action = guard(
			{ action: "read", resource: "post" },
			async () => "ok",
		);

		await expect(action()).rejects.toThrow("unauthenticated");
		expect(seen).toEqual(["401"]);
	});

	it("still denies when onUnauthenticated returns instead of throwing", async () => {
		const seen: string[] = [];
		const guard = createGuard({
			ac,
			getActor: () => null,
			policy: () => [],
			onUnauthenticated: (() => {
				seen.push("401");
			}) as () => never,
		});
		const action = guard(
			{ action: "read", resource: "post" },
			async () => "ok",
		);

		await expect(action()).rejects.toBeInstanceOf(ForbiddenError);
		expect(seen).toEqual(["401"]);
	});

	it("falls back to a plain denial without the hook", async () => {
		const guard = createGuard({ ac, getActor: () => null, policy: () => [] });
		const action = guard(
			{ action: "read", resource: "post" },
			async () => "ok",
		);

		await expect(action()).rejects.toThrow(ForbiddenError);
	});
});
