import { defineAbilities, type ShapeOf, type } from "@vetojs/core";

export type Workspace = {
	id: string;
	name: string;
	archived: boolean;
};

export type Blog = {
	id: string;
	workspaceId: string;
	name: string;
};

export type Post = {
	id: string;
	blogId: string;
	authorId: string;
	status: "draft" | "published";
	title: string;
	views: number;
};

export type Comment = {
	id: string;
	postId: string;
	spam: boolean;
};

export type User = {
	id: string;
	name: string;
};

export const ac = defineAbilities({
	resources: {
		workspace: {
			schema: type<Workspace>(),
			actions: ["read", "update"],
		},
		blog: {
			schema: type<Blog>(),
			actions: ["read"],
			relations: {
				workspace: { resource: "workspace", kind: "one" },
			},
		},
		post: {
			schema: type<Post>(),
			actions: ["read", "update", "publish", "delete"],
			relations: {
				blog: { resource: "blog", kind: "one" },
				author: { resource: "user", kind: "one" },
				comments: { resource: "comment", kind: "many" },
			},
		},
		comment: {
			schema: type<Comment>(),
			actions: ["read", "delete"],
		},
		user: {
			schema: type<User>(),
			actions: ["read"],
		},
		analytics: {
			schema: type<{ workspaceId: string }>(),
			actions: ["view"],
		},
	},
});

export type AC = typeof ac;
export type PostShape = ShapeOf<AC, "post">;
