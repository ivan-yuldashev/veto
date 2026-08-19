import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/guard/index.ts"],
	format: ["esm"],
	target: "es2022",
	dts: true,
	splitting: true,
	sourcemap: true,
	clean: true,
});
