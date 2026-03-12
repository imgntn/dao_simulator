import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  outputFileTracingExcludes: {
    "/": [
      "./results/**/*",
      "./paper/archive/**/*",
    ],
    "/console": ["./results/**/*", "./experiments/**/*"],
    "/results/\\[name\\]": ["./results/**/*"],
    "/api/research": ["./results/**/*", "./experiments/**/*", "./logs/**/*"],
    "/api/artifacts/\\[\\.\\.\\.slug\\]": [
      "./results/**/*",
      "./paper/**/*",
      "./docs/**/*",
    ],
  },
  // Note: workerThreads was disabled because it causes DataCloneError during
  // static page generation. Functions cannot be serialized across worker threads.
  // Re-enable if the underlying issue is resolved in a future Next.js version.
};

export default nextConfig;
