/** @type {import('next').NextConfig} */
const nextConfig = {
  // 告知 Next.js 这些包只在服务端运行，不要用 webpack 打包
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', 'playwright'],
  },
};

export default nextConfig;
