"use client";

import { createVetoContext } from "@vetojs/react";
import { ac } from "@vetojs-examples/shared";

export const { AbilityProvider, useAbility } = createVetoContext(ac);
