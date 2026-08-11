import { defineConfig } from "tsup";

const shared = {
	format: ["esm" as const],
	target: "es2022",
	dts: true,
	splitting: false,
	sourcemap: true,
	external: ["react", "@vetojs/core"],
};

export default defineConfig([
	{
		...shared,
		entry: ["src/index.ts"],
		clean: true,
		banner: { js: '"use client";' },
	},
	{
		...shared,
		entry: ["src/server.ts"],
	},
]);
