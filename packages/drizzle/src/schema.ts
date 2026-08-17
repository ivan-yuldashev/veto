import type {
	AbilitySet,
	ConditionNode,
	RelationKind,
	ResourceMap,
} from "@vetojs/core";
import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import {
	type CompileEnv,
	compileCondition,
	type JoinPredicate,
	type JoinResolution,
	type RelationTarget,
	widenCondition,
} from "./compile.js";
import { deriveJoinFromForeignKeys } from "./foreign-key-join.js";
import type { DrizzleSchema, JoinsFor, TableMap } from "./schema.types.js";

type WideJoins = Partial<
	Record<string, Partial<Record<string, JoinPredicate>>>
>;

type ResolvedJoins = Record<string, Record<string, JoinResolution>>;

type FilterArgs<AC extends ResourceMap> =
	| [resource: string, condition: ConditionNode<Record<string, unknown>>]
	| [ability: AbilitySet<AC>, action: string, resource: string];

const resolveJoin = (
	explicit: JoinPredicate | undefined,
	parent: PgTable | null | undefined,
	target: PgTable | null | undefined,
	kind: RelationKind,
): JoinResolution | undefined => {
	if (explicit !== undefined) {
		return { join: explicit };
	}

	if (parent === null || parent === undefined) {
		return undefined;
	}

	if (target === null || target === undefined) {
		return undefined;
	}

	return deriveJoinFromForeignKeys(parent, target, kind);
};

const resolveJoins = (
	ac: ResourceMap,
	tables: Record<string, PgTable | null | undefined>,
	joins: WideJoins,
): ResolvedJoins => {
	const resolved: ResolvedJoins = {};

	for (const [resource, definition] of Object.entries(ac)) {
		for (const [relationName, relation] of Object.entries(
			definition.relations ?? {},
		)) {
			const resolution = resolveJoin(
				joins[resource]?.[relationName],
				tables[resource],
				tables[relation.resource],
				relation.kind,
			);

			if (resolution === undefined) {
				continue;
			}

			const forResource = resolved[resource] ?? {};

			forResource[relationName] = resolution;
			resolved[resource] = forResource;
		}
	}

	return resolved;
};

export const defineTables = <AC extends ResourceMap, M extends TableMap<AC>>(
	ac: AC,
	tables: M,
	joins: JoinsFor<AC, M> = {},
): DrizzleSchema<AC> => {
	const byResource: Record<string, PgTable | null | undefined> = tables;

	const resolvedJoins = resolveJoins(ac, byResource, joins as WideJoins);

	const tableOrThrow = (resource: string, subject: string): PgTable => {
		const table = byResource[resource];

		if (table === null) {
			throw new Error(
				`@vetojs/drizzle: ${subject} is the phantom resource "${resource}" (declared without a table) — it has no SQL form.`,
			);
		}

		if (table === undefined) {
			throw new Error(
				`@vetojs/drizzle: ${subject} is "${resource}", which is not present in the defineTables table map.`,
			);
		}

		return table;
	};

	const resolveRelation = (
		from: string | undefined,
		relation: string,
	): Omit<RelationTarget, "alias"> => {
		const meta =
			from === undefined ? undefined : ac[from]?.relations?.[relation];

		if (meta === undefined) {
			throw new Error(
				`@vetojs/drizzle: relation "${relation}" of resource "${from}" is not declared in the ability registry (ac.relations).`,
			);
		}

		const target = tableOrThrow(
			meta.resource,
			`the target of relation "${relation}"`,
		);

		const resolution =
			from === undefined ? undefined : resolvedJoins[from]?.[relation];

		if (resolution === undefined || "unavailable" in resolution) {
			const cause =
				resolution === undefined ? "" : ` (${resolution.unavailable})`;

			throw new Error(
				`@vetojs/drizzle: no join predicate for relation "${relation}" of resource "${from}"${cause} — pass it in defineTables(ac, tables, joins) or declare .references() on the foreign-key column so the join can be derived.`,
			);
		}

		return { table: target, resource: meta.resource, join: resolution.join };
	};

	const buildEnv = (): CompileEnv => {
		let seen = 0;

		return (from, relation) => {
			const resolved = resolveRelation(from, relation);

			seen += 1;

			return { ...resolved, alias: `${relation}_${seen}` };
		};
	};

	const compileFor = (
		resource: string,
		condition: ConditionNode<Record<string, unknown>>,
	): SQL => {
		const table = tableOrThrow(resource, "the filtered resource");

		return compileCondition(condition, table, buildEnv(), resource);
	};

	const filter = (...args: FilterArgs<AC>): SQL => {
		if (args.length === 2) {
			const [resource, condition] = args;

			return compileFor(resource, condition);
		}

		const [ability, action, resource] = args;

		return compileFor(
			resource,
			widenCondition(ability.where(action, resource)),
		);
	};

	return { filter: filter as DrizzleSchema<AC>["filter"] };
};
