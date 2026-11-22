import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the local network load dev assets/HMR when the dev
  // server is opened via the machine's LAN IP. Dev-only; ignored in prod.
  allowedDevOrigins: ["192.168.0.22", "192.168.0.*"],

  // One canonical host: session cookies are host-only and every link the app
  // builds (Vipps return URL, e-mails) should land where the customer is
  // signed in, so www.nooracare.no is sent to nooracare.no. The Vipps webhook
  // is left alone: Vipps does not follow redirects and signs the request for
  // the host it was registered with, so it must be answered on either host.
  // PostHog reverse proxy: the SDK (src/lib/analytics/posthog.ts) talks to
  // /ingest on our own origin so ad blockers don't drop the events. EU hosts
  // only. The static/array rules must come before the catch-all.
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://eu-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://eu-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://eu.i.posthog.com/:path*",
      },
    ];
  },
  // PostHog posts to paths with a trailing slash (/ingest/e/); Next's default
  // 308 to /ingest/e would break capture. src/proxy.ts re-adds the
  // trailing-slash redirect for every app path, so canonical URLs are unchanged.
  skipTrailingSlashRedirect: true,

  async redirects() {
    return [
      {
        // /ingest is left alone as well: analytics requests must not bounce.
        source: "/:path((?!api/webhooks/|ingest/).*)",
        has: [{ type: "host", value: "www.nooracare.no" }],
        destination: "https://nooracare.no/:path",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
