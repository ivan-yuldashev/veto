import { defineProject } from "vitest/config";
import { coreAlias } from "../../vitest.alias.js";

export default defineProject({
	resolve: { alias: coreAlias },
});
