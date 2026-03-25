/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'playwright-core',
      'playwright',
      '@sparticuz/chromium',
    ],
  },
};

export default nextConfig;
