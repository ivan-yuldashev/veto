import type { MANAGE_ACTION, RelationKind } from "../shared/index.js";
import type { AnySchema, InferSchema } from "./schema.types.js";

/** A declared link to another resource: which resource, and how many of it. */
export type Relation<R extends string = string> = {
	resource: R;
	kind: RelationKind;
};

export type ResourceDefinition<R extends string = string> = {
	/**
	 * The row shape — {@link shape} for a type alone, or a Standard Schema validator when
	 * `ability.validate` should check incoming data.
	 *
	 * Leave it out for a resource that has no rows, such as a screen or a report. The shape
	 * is then empty: no row can be passed by mistake and no field condition can be written.
	 */
	schema?: AnySchema;
	actions: readonly string[];
	relations?: Record<string, Relation<R>>;
};

export type ResourceMap = Record<string, ResourceDefinition>;

export type ResourceName<T extends ResourceMap> = keyof T & string;

export type ActionFor<T extends ResourceMap, R extends keyof T> =
	| T[R]["actions"][number]
	| typeof MANAGE_ACTION;

type EmptyShape = Record<string, never>;

type SchemaOf<T extends ResourceMap, R extends keyof T> = Extract<
	T[R]["schema"],
	AnySchema
>;

export type ShapeOf<T extends ResourceMap, R extends keyof T> = [
	SchemaOf<T, R>,
] extends [never]
	? EmptyShape
	: InferSchema<SchemaOf<T, R>>;
