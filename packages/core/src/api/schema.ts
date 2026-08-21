import { isPlainObject } from "../shared/index.js";
import type { AnySchema, Schema, ValidateResult } from "./schema.types.js";

export type {
	AnySchema,
	InferSchema,
	Schema,
	StandardSchema,
	ValidateResult,
} from "./schema.types.js";

const passthrough = (value: unknown): unknown => value;

/**
 * Declares a resource's shape, carrying `T` into the type system at zero runtime cost.
 *
 * Pass a [Standard Schema](https://standardschema.dev) (Zod, Valibot, ArkType) instead when
 * you also want `ability.validate` to check incoming data at runtime.
 *
 * @example
 * schema: shape<{ id: string; authorId: string }>()
 */
export const shape = <T>(): Schema<T> => passthrough;

/**
 * The same declaration as {@link shape}.
 *
 * @alias
 * @deprecated Use {@link shape}. This name collides with the TypeScript `type` modifier, so
 * an import carrying both reads like a typo and import sorters disagree about its order.
 */
export const type = shape;

export const validateSchema = (
	schema: AnySchema,
	data: unknown,
): ValidateResult<Record<string, unknown>> => {
	if (typeof schema !== "object" || !("~standard" in schema)) {
		return isPlainObject(data)
			? { ok: true, value: data }
			: { ok: false, issues: [{ message: "expected an object" }] };
	}

	const result = schema["~standard"].validate(data);

	if (result instanceof Promise) {
		throw new Error(
			"veto: asynchronous schema validation is not supported (validate returned a Promise).",
		);
	}

	if (result.issues) {
		return {
			ok: false,
			issues: result.issues.map((issue) => ({ message: issue.message })),
		};
	}

	return { ok: true, value: result.value };
};
