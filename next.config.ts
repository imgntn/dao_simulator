import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    workerThreads: true,
  },
};

export default nextConfig;
