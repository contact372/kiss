
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
  },
  allowedDevOrigins: ["https://6000-firebase-kiss-ai-2-1754410092156.cluster-lu4mup47g5gm4rtyvhzpwbfadi.cloudworkstations.dev"],
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
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
