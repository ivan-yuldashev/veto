import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		environment: "happy-dom",
		projects: ["packages/*"],
		coverage: {
			provider: "v8",
			include: ["packages/*/src/**"],
			reporter: ["text"],
		},
	},
});
