import { buildAbility, createRules, defineAbilities, type } from "@vetojs/core";
import { Can } from "../src/server.js";

const ac = defineAbilities({
	resources: {
		post: { schema: type<{ id: string }>(), actions: ["read", "update"] },
		user: { schema: type<{ id: string }>(), actions: ["read"] },
	},
});
const { allow } = createRules(ac);
const ability = buildAbility(ac, [allow("read", "post")]);

export const ok = (
	<>
		<Can ability={ability} I="read" a="post" />
		<Can ability={ability} I="update" a="post" this={{ id: "p1" }} />
		<Can ability={ability} I="read" a="user" />
	</>
);

export const bad = (
	<>
		{/* @ts-expect-error "user" has no "update" */}
		<Can ability={ability} I="update" a="user" />
		{/* @ts-expect-error "comment" is not a resource */}
		<Can ability={ability} I="read" a="comment" />
		{/* @ts-expect-error the ability is required */}
		<Can I="read" a="post" />
	</>
);
