import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets a phone on the local network load dev assets/HMR when the dev
  // server is opened via the machine's LAN IP. Dev-only; ignored in prod.
  allowedDevOrigins: ["192.168.0.22", "192.168.0.*"],
};

export default nextConfig;
