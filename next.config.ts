
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co', // Keep existing if still needed
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.pinimg.com', // Specifically allow i.pinimg.com
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Or 'http' if you need that too, but HTTPS is safer
        hostname: '**', // This allows all hostnames
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
