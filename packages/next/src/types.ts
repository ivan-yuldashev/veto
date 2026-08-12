import type {
	AbilitySet,
	ActionFor,
	CheckedRules,
	ForbiddenError,
	ResourceMap,
	ResourceName,
	ShapeOf,
} from "@vetojs/core";

export type Awaitable<T> = T | Promise<T>;

export type Row = Record<string, unknown>;

export type GuardOptions = {
	action: string;
	resource: string;
	load?: (...args: unknown[]) => unknown;
	payload?: (...args: unknown[]) => Row;
};

/**
 * Configured once per app; each action then only says what it acts on.
 */
export type GuardConfig<AC extends ResourceMap, Actor> = {
	/** Your {@link defineAbilities} declarations. */
	ac: AC;

	/**
	 * How to find the current user — cookies, session, headers.
	 *
	 * Return `null` (or `undefined`) when there is nobody signed in; the guard then calls
	 * {@link GuardConfig.onUnauthenticated} instead of building a policy for a non-user.
	 */
	getActor: () => Awaitable<Actor | null | undefined>;

	/** The actor → rules function. Never called without an actor. */
	policy: (actor: Actor) => CheckedRules;

	/**
	 * What to do when nobody is signed in. Must not return — throw, `redirect()`, or
	 * answer with a 401.
	 *
	 * Without it, an absent actor is treated as an actor with no rules: the check fails
	 * and you get the usual {@link ForbiddenError}. That is safe, but it reports 403
	 * where 401 is the honest answer — which is why REST handlers will want this hook.
	 *
	 * @example
	 * onUnauthenticated: () => { throw new Response(null, { status: 401 }); }
	 */
	onUnauthenticated?: () => never;

	/** What to do when the actor is known but not allowed. Must not return. */
	onDeny?: (error: ForbiddenError) => never;
};

export type ActionOptions<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	Args extends unknown[],
> = {
	action: ActionFor<AC, R>;
	resource: R;
	load?: (...args: Args) => Awaitable<ShapeOf<AC, R>>;
	payload?: (...args: Args) => Partial<ShapeOf<AC, R>>;
};

export type GuardContext<
	AC extends ResourceMap,
	R extends ResourceName<AC>,
	Actor,
> = {
	actor: Actor;
	ability: AbilitySet<AC>;
	row: ShapeOf<AC, R> | undefined;
	payload: Partial<ShapeOf<AC, R>> | undefined;
};

export type WithPermission<AC extends ResourceMap, Actor> = <
	R extends ResourceName<AC>,
	Args extends unknown[],
	Result,
>(
	options: ActionOptions<AC, R, Args>,
	handler: (
		ctx: GuardContext<AC, R, Actor>,
		...args: Args
	) => Awaitable<Result>,
) => (...args: Args) => Promise<Result>;
