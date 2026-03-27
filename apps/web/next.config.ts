import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: '/home/sprite/lavanda-pos',
  transpilePackages: ['@lavanda/shared', '@lavanda/ui', '@lavanda/i18n'],
};

export default nextConfig;
