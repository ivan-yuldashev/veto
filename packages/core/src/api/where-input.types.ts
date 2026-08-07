import type { RelationKind } from "../shared/index.js";
import type { FieldValue } from "./condition-shorthand.types.js";
import type {
	ResourceMap,
	ResourceName,
	ShapeOf,
} from "./define-abilities.types.js";

type Rels<AC extends ResourceMap, R extends ResourceName<AC>> = AC[R] extends {
	relations: infer X;
}
	? X
	: Record<never, never>;

type RelationNames<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	K extends RelationKind,
> = {
	[Rel in keyof Rels<AC, R>]: Rels<AC, R>[Rel] extends { kind: K }
		? Rel
		: never;
}[keyof Rels<AC, R>] &
	string;

type RelatedResource<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	Rel extends keyof Rels<AC, R>,
> = Rels<AC, R>[Rel] extends { resource: infer RR extends ResourceName<AC> }
	? RR
	: never;

type Depth = [never, 0, 1, 2, 3, 4, 5, 6];

type Quantifier<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	D extends number,
> = {
	some?: WhereInput<AC, R, D>;
	every?: WhereInput<AC, R, D>;
	none?: WhereInput<AC, R, D>;
};

type WhereKeys<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	D extends number,
> =
	| Exclude<keyof ShapeOf<AC, R>, "and" | "or" | "not">
	| ([D] extends [never]
			? never
			:
					| RelationNames<AC, R, "one">
					| RelationNames<AC, R, "many">
					| "and"
					| "or"
					| "not");

type WhereValue<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	K extends PropertyKey,
	D extends number,
> = K extends "and" | "or"
	? WhereInput<AC, R, Depth[D]>[]
	: K extends "not"
		? WhereInput<AC, R, Depth[D]>
		: K extends RelationNames<AC, R, "one">
			? WhereInput<AC, RelatedResource<AC, R, K>, Depth[D]>
			: K extends RelationNames<AC, R, "many">
				? Quantifier<AC, RelatedResource<AC, R, K>, Depth[D]>
				: K extends keyof ShapeOf<AC, R>
					? FieldValue<ShapeOf<AC, R>[K]>
					: never;

export type WhereInput<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	D extends number = 3,
> = {
	[K in WhereKeys<AC, R, D>]?: WhereValue<AC, R, K, D>;
};
