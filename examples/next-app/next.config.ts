import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	experimental: { authInterrupts: true },
	transpilePackages: ["@vetojs-examples/shared"],
	serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
