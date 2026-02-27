import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@remotion/renderer",
    "@remotion/bundler",
    "echogarden",
    "@echogarden/espeak-ng-emscripten",
  ],
  turbopack: {}, // silences warning when using --webpack
  webpack: (config, { isServer }) => {
    if (isServer) {
      // winax is Windows-only; use stub on macOS/Linux
      config.resolve.alias = {
        ...config.resolve.alias,
        winax: path.resolve(__dirname, "scripts/winax-stub.js"),
      };
    }
    
    // Handle node: protocol imports
    config.module = {
      ...config.module,
      parser: {
        ...config.module?.parser,
        javascript: {
          ...config.module?.parser?.javascript,
          importExportsPresence: 'error',
        },
      },
    };
    
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
