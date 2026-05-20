import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["puppeteer"],
  outputFileTracingIncludes: {
    "/api/export-pdf": ["./.cache/puppeteer/**/*"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  allowedDevOrigins: [
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
