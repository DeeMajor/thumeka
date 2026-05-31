import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone build emits a self-contained `.next/standalone/server.js`
  // bundle with only the runtime files it needs. That's what Plesk's Node.js
  // (Phusion Passenger) extension runs in production — small footprint, fast
  // boot, no `node_modules` round trip on deploy.
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
    ]
  }
};

// Sentry wraps the build to enable source-map upload + tunneling. When
// SENTRY_AUTH_TOKEN is unset (local dev, CI without secrets) the wrapper is
// inert — no warnings, no upload attempts — so the same config works
// everywhere.
export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: "/monitoring"
});
