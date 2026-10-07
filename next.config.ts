import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // every page here shows live, per-person data; no component caching
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
