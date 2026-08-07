export type Schema<T> = ((value: unknown) => unknown) & {
	readonly "~veto.shape"?: T;
};

export type StandardSchema<Output = unknown> = {
	readonly "~standard": {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (
			value: unknown,
		) => StandardResult<Output> | Promise<StandardResult<Output>>;
		readonly types?:
			| { readonly input: unknown; readonly output: Output }
			| undefined;
	};
};

type StandardResult<Output> =
	| { readonly value: Output; readonly issues?: undefined }
	| { readonly issues: ReadonlyArray<{ readonly message: string }> };

export type AnySchema =
	| Schema<Record<string, unknown>>
	| StandardSchema<Record<string, unknown>>;

export type InferSchema<S> = S extends StandardSchema
	? NonNullable<S["~standard"]["types"]>["output"]
	: S extends Schema<infer T>
		? T
		: never;

export type ValidateResult<T> =
	| { ok: true; value: T }
	| { ok: false; issues: { message: string }[] };
