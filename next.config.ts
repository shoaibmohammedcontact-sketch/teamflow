import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview/chat iframe origin to load /_next/* dev resources.
  // Without this, Next.js dev server emits a cross-origin warning and may
  // serve mismatched HMR scripts to the iframe, which surfaces as a React
  // hydration error ("server rendered HTML didn't match the client properties").
  allowedDevOrigins: [
    "*.space-z.ai",
    "preview-chat-*.space-z.ai",
    "localhost:3000",
    "127.0.0.1:3000",
  ],
};

export default nextConfig;
