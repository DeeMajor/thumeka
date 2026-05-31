// Next.js instrumentation hook — loads the right Sentry config per runtime.
// Required for Sentry to wire into server and edge handlers.

import type { Instrumentation } from "next";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError: Instrumentation.onRequestError = (...args) => {
  // Forward unhandled request errors to Sentry only when configured.
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    import("@sentry/nextjs").then((Sentry) => {
      Sentry.captureRequestError(...args);
    });
  }
};
