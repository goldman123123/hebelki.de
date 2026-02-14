import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Disable aggressive caching in development for better HMR
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config) => {
      config.cache = false
      return config
    },
  }),

  // Better error overlay and strict mode
  reactStrictMode: true,

  // Externalize Puppeteer/Chromium for serverless PDF generation
  serverExternalPackages: ['@sparticuz/chromium-min', 'puppeteer-core', 'puppeteer'],

  // Optimize package imports for faster builds
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Turbopack is enabled by default in Next.js 16
  // but we can configure it further if needed

  // Security headers
  async headers() {
    const sharedHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
    ]

    return [
      // Embed routes — allow framing from any site
      {
        source: '/embed/:path*',
        headers: [
          ...sharedHeaders,
          { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        ],
      },
      // All other routes — block framing
      {
        source: '/((?!embed/).*)',
        headers: [
          ...sharedHeaders,
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
  // Short URL redirects for legal pages
  async redirects() {
    return [
      { source: '/agb', destination: '/allgemeine-geschaeftsbedingungen', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig);
