const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.js');

const nextConfig = {
  // Build output directory (both dev cache and production build)
  distDir: 'build',

  // Page extensions
  pageExtensions: ['js', 'jsx'],

  // NOTE: No turbopack.resolveAlias needed — Next.js automatically picks up
  // "@/*" path alias from jsconfig.json / tsconfig.json for both Turbopack and webpack.
  // Adding resolveAlias: { '@': '.' } here would break ALL @-scoped npm packages
  // (@mui/material, @emotion/react, @reduxjs/toolkit, etc.)

  experimental: {
    optimizeCss: false, // Disabled — avoids critters peer-dep error
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 'quickhire.services', pathname: '/**' },
      { protocol: 'https', hostname: 'demo16.vcto.in', pathname: '/**' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // MUI needs explicit transpilation to avoid CJS/ESM issues
  transpilePackages: ['@mui/material', '@mui/icons-material'],

  // Cache headers for static assets
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  // ── Country-prefix routing ────────────────────────────────────────────────
  // When NEXT_PUBLIC_COUNTRY_PATH_ROUTING=true, proxy.js 307-redirects every
  // path-less URL to its country-prefixed version (e.g. / → /ae/).
  // These rewrites internally strip the prefix so the existing app/ routes
  // handle the request — no route group duplication needed.
  //
  //   /ae/service-details/123  →  /service-details/123  (cookie=AE already set)
  //   /ae                      →  /
  async redirects() {
    return [
      { source: '/blog', destination: '/industry-perspectives', permanent: true },
      { source: '/blog/category/:slug*', destination: '/industry-perspectives/category/:slug*', permanent: true },
      { source: '/blog/:slug*', destination: '/industry-perspectives/:slug*', permanent: true },
    ];
  },

  async rewrites() {
    return [
      // Root: /ae → /
      {
        source: '/:country(in|ae|de|us|au)',
        destination: '/',
      },
      // All sub-paths: /ae/service-details/123 → /service-details/123
      {
        source: '/:country(in|ae|de|us|au)/:path*',
        destination: '/:path*',
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
