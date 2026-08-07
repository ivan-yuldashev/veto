import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["packages/*", "internal/packages/*"],
		coverage: {
			provider: "v8",
			include: ["packages/*/src/**"],
			reporter: ["text"],
		},
	},
});
