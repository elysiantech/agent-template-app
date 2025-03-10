import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {},
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
  env: {
  },
};

export default nextConfig;
