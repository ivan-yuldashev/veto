import type {
	AbilitySet,
	ActionFor,
	ConditionNode,
	ResourceMap,
	ResourceName,
	ShapeOf,
} from "@vetojs/core";
import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";

type RelationsOf<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
> = NonNullable<AC[R]["relations"]>;

type TargetOf<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	Rel extends keyof RelationsOf<AC, R>,
> = RelationsOf<AC, R>[Rel] extends { resource: infer T }
	? T & ResourceName<AC>
	: never;

type TableFor<Shape> = PgTable & {
	readonly $inferSelect: { [K in keyof Shape & string]: unknown };
};

export type TableMap<AC extends ResourceMap> = {
	[R in ResourceName<AC>]: TableFor<ShapeOf<AC, R>> | null;
};

export type JoinsFor<AC extends ResourceMap, M extends TableMap<AC>> = {
	[R in ResourceName<AC>]?: {
		[Rel in keyof RelationsOf<AC, R> & string]?: (
			parent: NonNullable<M[R]>,
			child: NonNullable<M[TargetOf<AC, R, Rel>]>,
		) => SQL;
	};
};

export type DrizzleSchema<AC extends ResourceMap> = {
	filter: {
		<R extends ResourceName<AC>>(
			resource: R,
			condition: ConditionNode<ShapeOf<AC, R>>,
		): SQL;
		<R extends ResourceName<AC>>(
			ability: AbilitySet<AC>,
			action: ActionFor<AC, R>,
			resource: R,
		): SQL;
	};
};
