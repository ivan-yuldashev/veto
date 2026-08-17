import { buildAbility } from "@vetojs/core";
import { createGuard } from "@vetojs/next";
import { ac, policyFor } from "@vetojs-examples/shared";
import { cache } from "react";
import { getActor } from "./auth";

export const withPermission = createGuard({
	ac,
	getActor,
	policy: policyFor,
});

export const getRules = cache(async () => policyFor(await getActor()));

export const getAbility = cache(async () => buildAbility(ac, await getRules()));
