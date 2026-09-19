import type { NextConfig } from 'next';
import { nextSecurityHeaderSources } from './lib/security-headers';

const clientPackTextFiles = [
  './public/client-packs/**/*.html',
  './public/client-packs/**/*.md',
];

const nextConfig: NextConfig = {
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core'],
  // Pack HTML is read from disk with a dynamic path (NFT cannot see it).
  // PDFs/images are never loaded as utf8 — keep them out of every function.
  outputFileTracingIncludes: {
    '/ops/p/[slug]/canvas/[id]': clientPackTextFiles,
    '/ops/p/[slug]/canvas/[id]/pdf': clientPackTextFiles,
    '/ops/projects/[id]': clientPackTextFiles,
    '/ops/projects/[id]/arquitectura/[deliverableId]': clientPackTextFiles,
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  transpilePackages: ['docx-preview', 'pptxviewjs'],
  serverActions: {
    bodySizeLimit: '10mb',
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
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
