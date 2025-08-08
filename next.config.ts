import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow all HTTPS domains
      {
        protocol: 'https',
        hostname: '**',
      },
      // Allow all HTTP domains
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
