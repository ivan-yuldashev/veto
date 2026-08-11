import { type CheckedRules, createRules } from "@vetojs/core";
import { ac } from "./model";

export type Role = "viewer" | "editor" | "admin";

export type Actor = {
	id: string;
	memberships: { workspaceId: string; role: Role }[];
};

const { allow, deny } = createRules(ac);

export const policyFor = (actor: Actor): CheckedRules => {
	const rules = actor.memberships.flatMap(({ workspaceId, role }) => {
		const membershipRules: CheckedRules = [
			allow("read", "workspace", { where: { id: workspaceId } }),
			allow("read", "blog", { where: { workspace: { id: workspaceId } } }),
			allow("read", "post", {
				where: {
					status: "published",
					blog: { workspace: { id: workspaceId } },
				},
			}),
			allow("read", "post", {
				where: {
					views: { gte: 100 },
					blog: { workspace: { id: workspaceId } },
				},
			}),
		];

		if (role === "editor" || role === "admin") {
			membershipRules.push(
				allow("view", "analytics", { where: { workspaceId } }),
				allow("read", "post", {
					where: { blog: { workspace: { id: workspaceId } } },
				}),
				allow(["update", "publish"], "post", {
					where: {
						authorId: actor.id,
						blog: { workspace: { id: workspaceId } },
					},
					payload: {
						fields: ["title", "status"],
						constraints: { status: { in: ["draft"] } },
					},
				}),
			);
		}

		if (role === "admin") {
			membershipRules.push(
				allow("manage", "post", {
					where: { blog: { workspace: { id: workspaceId } } },
				}),
				allow("update", "workspace", { where: { id: workspaceId } }),
			);
		}

		return membershipRules;
	});

	return [
		...rules,
		allow("read", "comment"),
		deny("read", "comment", { where: { spam: true } }),
		deny(["update", "publish", "delete"], "post", {
			where: { blog: { workspace: { archived: true } } },
		}),
		deny(["update", "publish"], "post", {
			where: { comments: { some: { spam: true } } },
		}),
	];
};
