import { createVetoContext } from "@vetojs/react";
import { ac } from "@vetojs-examples/shared";

export const { AbilityProvider, useAbility, useCan, useSetRules, Can } =
	createVetoContext(ac);
