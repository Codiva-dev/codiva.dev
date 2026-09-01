import type { NextConfig } from 'next';
import { nextSecurityHeaderSources } from './lib/security-headers';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '*': ['./public/client-packs/**/*'],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      { source: '/empleos/tester-qa', destination: '/empleos/tester', permanent: true },
      { source: '/empleos/tester-qa/:path*', destination: '/empleos/tester/:path*', permanent: true },
      { source: '/tester-qa', destination: '/tester', permanent: true },
      { source: '/tester-qa/:path*', destination: '/tester/:path*', permanent: true },
    ];
  },
  async headers() {
    return [
      ...nextSecurityHeaderSources(),
      {
        source: '/logos/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
