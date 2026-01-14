import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@charka-ui/react"]
  }
};

export default nextConfig;
