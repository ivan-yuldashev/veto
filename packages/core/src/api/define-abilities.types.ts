import type { MANAGE_ACTION, RelationKind } from "../shared/index.js";
import type { AnySchema, InferSchema } from "./schema.types.js";

/** A declared link to another resource: which resource, and how many of it. */
export type Relation<R extends string = string> = {
	resource: R;
	kind: RelationKind;
};

export type ResourceDefinition<R extends string = string> = {
	schema: AnySchema;
	actions: readonly string[];
	relations?: Record<string, Relation<R>>;
};

export type ResourceMap = Record<string, ResourceDefinition>;

export type ResourceName<T extends ResourceMap> = keyof T & string;

export type ActionFor<T extends ResourceMap, R extends keyof T> =
	| T[R]["actions"][number]
	| typeof MANAGE_ACTION;

export type ShapeOf<T extends ResourceMap, R extends keyof T> = InferSchema<
	T[R]["schema"]
>;
