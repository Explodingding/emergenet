// Auto-detects CI / GitHub Pages and switches between:
//   - static export (output: 'export') for GitHub Pages
//   - standalone (default) for local dev & Emergent preview
const isCI = process.env.GITHUB_ACTIONS === 'true' || process.env.GITHUB_PAGES === 'true';
const repo = process.env.GH_PAGES_REPO || 'emergenet';

const baseConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev }) {
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
};

if (isCI) {
  // GitHub Pages static export (basePath/assetPrefix injected by actions/configure-pages
  // when `static_site_generator: next` is used, but we set them explicitly as fallback)
  module.exports = {
    ...baseConfig,
    output: 'export',
    basePath: `/${repo}`,
    assetPrefix: `/${repo}/`,
    trailingSlash: true,
  };
} else {
  module.exports = {
    ...baseConfig,
    output: 'standalone',
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'ALLOWALL' },
            { key: 'Content-Security-Policy', value: 'frame-ancestors *;' },
            { key: 'Access-Control-Allow-Origin', value: process.env.CORS_ORIGINS || '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
            { key: 'Access-Control-Allow-Headers', value: '*' },
          ],
        },
      ];
    },
  };
}
