"use server";

import { ForbiddenError } from "@vetojs/core";
import { actors, type PostShape } from "@vetojs-examples/shared";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getDb, loadComposedPost, postsTable } from "./db";
import { withPermission } from "./permissions";

export const switchActor = async (formData: FormData) => {
	const name = String(formData.get("actor"));
	if (name in actors) {
		(await cookies()).set("actor", name);
	}
	revalidatePath("/", "layout");
};

export type UpdatePostState =
	| { ok: true }
	| { error: string }
	| { issues: string[] }
	| null;

const readStatus = (raw: FormDataEntryValue | null) => {
	if (raw === "draft") {
		return "draft" as const;
	}

	if (raw === "published") {
		return "published" as const;
	}

	return undefined;
};

const guardedUpdate = withPermission(
	{
		action: "update",
		resource: "post",
		load: async (_state: UpdatePostState, formData: FormData) => {
			const post = await loadComposedPost(String(formData.get("id")));
			if (post === undefined) {
				throw new Error("post not found");
			}
			return post;
		},
		payload: (_state, formData): Partial<PostShape> => {
			const next: Partial<PostShape> = { title: String(formData.get("title")) };

			const status = readStatus(formData.get("status"));
			if (status !== undefined) {
				next.status = status;
			}

			const authorId = formData.get("authorId");
			if (typeof authorId === "string") {
				next.authorId = authorId;
			}

			return next;
		},
	},
	async (ctx, _state, formData) => {
		const shape = ctx.ability.validate("post", { ...ctx.row, ...ctx.payload });

		if (!shape.ok) {
			return { issues: shape.issues.map((issue) => issue.message) };
		}

		const db = await getDb();
		const next: {
			title?: string;
			status?: "draft" | "published";
			authorId?: string;
		} = {};
		if (typeof ctx.payload?.title === "string") {
			next.title = ctx.payload.title;
		}
		if (ctx.payload?.status) {
			next.status = ctx.payload.status;
		}
		if (typeof ctx.payload?.authorId === "string") {
			next.authorId = ctx.payload.authorId;
		}
		await db
			.update(postsTable)
			.set(next)
			.where(eq(postsTable.id, String(formData.get("id"))));
		revalidatePath("/posts");
		return { ok: true } as const;
	},
);

export const updatePost = async (
	state: UpdatePostState,
	formData: FormData,
): Promise<UpdatePostState> => {
	try {
		return await guardedUpdate(state, formData);
	} catch (error) {
		if (ForbiddenError.is(error)) {
			const violations = error.violations
				?.map((violation) => `${violation.field}: ${violation.reason}`)
				.join("; ");
			return { error: violations ?? error.message };
		}
		throw error;
	}
};
