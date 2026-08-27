import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Images from allowlisted domains only (SSRF prevention — never user-supplied URLs)
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
