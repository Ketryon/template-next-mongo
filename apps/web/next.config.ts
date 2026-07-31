import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ketryon/db ships TypeScript source (JIT), so Next compiles it.
  transpilePackages: ["@ketryon/db"],

  // Keep the driver out of the bundle — it is required at runtime on the server.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
