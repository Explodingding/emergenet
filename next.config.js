/** @type {import('next').NextConfig} */
const isCI = !!process.env.GITHUB_ACTIONS || process.env.GITHUB_PAGES === 'true';
const repo = process.env.GH_PAGES_REPO || 'emergenet';

const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  basePath: isCI ? `/${repo}` : '',
  assetPrefix: isCI ? `/${repo}/` : '',
  trailingSlash: true,
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

module.exports = nextConfig;
