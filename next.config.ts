import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/vaahan-safe-collector",
  assetPrefix: "/vaahan-safe-collector/",
  images: { unoptimized: true },
};

export default nextConfig;
