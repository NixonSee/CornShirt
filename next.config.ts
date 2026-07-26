import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate directory is useful for CI/build verification when a local
  // dev server or OneDrive has the default `.next` cache locked.
  distDir: process.env.CORNSHIRT_NEXT_DIST_DIR ?? ".next",
  // Allow mobile devices on the local Wi-Fi network to load development
  // assets and connect to Turbopack hot reloading.
  allowedDevOrigins: ["192.168.0.18", "*.trycloudflare.com"],
};

export default nextConfig;
