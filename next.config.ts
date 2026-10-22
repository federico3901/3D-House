import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site (out/): it can be hosted anywhere, one copy per impresa (see README, "Multi-impresa").
  output: "export",
  // Every route becomes <route>/index.html, which any static host serves.
  trailingSlash: true,
  images: { unoptimized: true },
  devIndicators: false,
  env: {
    // PORTABLE=1 builds a copy that also works from an unknown sub-path (scripts/make-portable.mjs finishes it).
    NEXT_PUBLIC_PORTABLE: process.env.PORTABLE ? "1" : "",
    NEXT_PUBLIC_TENANT: process.env.TENANT ?? "demo",
  },
  turbopack: {
    rules: {
      "*.css": {
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
