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
  async redirects() {
    return [
      {
        source: "/:path((?!api/webhooks/).*)",
        has: [{ type: "host", value: "www.nooracare.no" }],
        destination: "https://nooracare.no/:path",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
