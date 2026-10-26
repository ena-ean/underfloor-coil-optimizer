import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle used by the Docker image.
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // The app has no raster images: skip the optimizer and its native binaries.
  images: { unoptimized: true },
  outputFileTracingExcludes: {
    "*": ["node_modules/sharp/**", "node_modules/@img/**"],
  },
};

export default nextConfig;
