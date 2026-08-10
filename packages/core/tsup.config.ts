import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts", "src/internal.ts"],
	format: ["esm"],
	target: "es2022",
	dts: true,
	splitting: false,
	sourcemap: true,
	clean: true,
});
