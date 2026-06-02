import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  transpilePackages: ['@the-others/webview-protocol'],
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
