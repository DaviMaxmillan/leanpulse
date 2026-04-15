import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow access from other devices on the local network (LAN/Wi-Fi)
  // Required in Next.js 15+ for cross-origin dev server access
  allowedDevOrigins: [
    "192.168.100.146",
    "192.168.100.*",
    "192.168.*.*",
  ],
};

export default nextConfig;
