import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: workerThreads was disabled because it causes DataCloneError during
  // static page generation. Functions cannot be serialized across worker threads.
  // Re-enable if the underlying issue is resolved in a future Next.js version.
};

export default nextConfig;
