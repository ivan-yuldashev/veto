import type { ActionFor, ShapeOf } from "../src/index.js";
import {
	buildAbility,
	createRules,
	defineAbilities,
	type,
} from "../src/index.js";

export const ac = defineAbilities({
	resources: {
		r01: {
			schema: type<{
				id: string;
				status: "draft" | "published";
				views: number;
			}>(),
			actions: ["read", "create", "update", "delete", "publish"],
			relations: {
				author: { resource: "r06", kind: "one" },
				tags: { resource: "r14", kind: "many" },
			},
		},
		r02: {
			schema: type<{ id: string; title: string }>(),
			actions: ["read", "update"],
		},
		r03: {
			schema: type<{ id: string; count: number; active: boolean }>(),
			actions: ["read", "create", "delete"],
		},
		r04: {
			schema: type<{ id: string; name: string; createdAt: Date }>(),
			actions: ["read", "update", "archive"],
		},
		r05: {
			schema: type<{ id: string; price: number; currency: "usd" | "eur" }>(),
			actions: ["read", "update"],
		},
		r06: {
			schema: type<{ id: string; email: string; verified: boolean }>(),
			actions: ["read", "create", "update", "delete"],
			relations: { profile: { resource: "r04", kind: "one" } },
		},
		r07: { schema: type<{ id: string; score: number }>(), actions: ["read"] },
		r08: {
			schema: type<{ id: string; label: string; weight: number }>(),
			actions: ["read", "update"],
		},
		r09: {
			schema: type<{ id: string; kind: "a" | "b" | "c"; size: number }>(),
			actions: ["read", "create"],
		},
		r10: {
			schema: type<{ id: string; body: string; pinned: boolean }>(),
			actions: ["read", "update", "delete"],
		},
		r11: {
			schema: type<{ id: string; total: number; paid: boolean }>(),
			actions: ["read", "refund"],
		},
		r12: {
			schema: type<{ id: string; slug: string }>(),
			actions: ["read", "update"],
		},
		r13: {
			schema: type<{ id: string; level: number; locked: boolean }>(),
			actions: ["read", "unlock"],
		},
		r14: {
			schema: type<{ id: string; tag: string; rank: number }>(),
			actions: ["read", "create", "delete"],
		},
		r15: {
			schema: type<{ id: string; due: Date; done: boolean }>(),
			actions: ["read", "update", "complete"],
		},
		r16: {
			schema: type<{ id: string; region: "eu" | "us" | "apac" }>(),
			actions: ["read"],
		},
		r17: {
			schema: type<{ id: string; amount: number; note: string }>(),
			actions: ["read", "update"],
		},
		r18: {
			schema: type<{ id: string; flag: boolean; ratio: number }>(),
			actions: ["read", "toggle"],
		},
		r19: {
			schema: type<{ id: string; code: string; uses: number }>(),
			actions: ["read", "create", "delete"],
		},
		r20: {
			schema: type<{ id: string; phase: "open" | "closed"; budget: number }>(),
			actions: ["read", "update", "close"],
		},
		r21: {
			schema: type<{ id: string; height: number; width: number }>(),
			actions: ["read", "update"],
		},
		r22: {
			schema: type<{ id: string; subject: string; read: boolean }>(),
			actions: ["read", "archive"],
		},
		r23: {
			schema: type<{ id: string; lat: number; lng: number }>(),
			actions: ["read"],
		},
		r24: {
			schema: type<{ id: string; version: number; draft: boolean }>(),
			actions: ["read", "update", "promote"],
		},
		r25: {
			schema: type<{ id: string; x: number; y: string; z: boolean }>(),
			actions: ["read", "create", "update", "delete"],
		},
	},
});

const { allow, deny } = createRules(ac);

export const policy = () => [
	allow("read", "r01", { where: { status: { eq: "published" } } }),
	allow(["update", "publish"], "r01", {
		where: { views: { gte: 100 } },
		payload: {
			fields: ["status"],
			constraints: { status: { in: ["draft", "published"] } },
		},
	}),
	deny("update", "r01", { payload: { fields: ["views"] } }),
	allow("read", "r04", { where: { name: { contains: "x" } } }),
	allow("update", "r05", { where: { currency: { eq: "usd" } } }),
	allow("read", "r15", { where: { done: { eq: false } } }),
	deny("complete", "r15", { where: { due: { lt: new Date() } } }),
	allow("read", "r20", { where: { phase: { eq: "open" }, budget: { gt: 0 } } }),
	allow("manage", "r25"),
	allow("read", "r01", {
		where: { author: { verified: { eq: true } } },
	}),
	allow("create", "r01", {
		where: { tags: { some: { rank: { gt: 5 } } } },
	}),
	allow("update", "r01", {
		where: { author: { profile: { name: { contains: "x" } } } },
	}),
	allow("delete", "r01", {
		where: {
			status: { eq: "draft" },
			tags: { none: { rank: { lt: 0 } } },
		},
	}),
];

const ability = buildAbility(ac, policy());

ability.can("read", "r01", { id: "1", status: "published", views: 10 });
ability.canMutate("update", "r05", { id: "1", price: 5, currency: "usd" });
ability.validatePayload(
	"update",
	"r01",
	{ id: "1", status: "draft", views: 1 },
	{ status: "published" },
);
ability.where("read", "r20");

export type ActionR09 = ActionFor<typeof ac, "r09">;
export type ShapeR24 = ShapeOf<typeof ac, "r24">;
