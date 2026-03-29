import path from 'node:path';
import type { NextConfig } from 'next';

const workspaceRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ['@lavanda/shared', '@lavanda/ui', '@lavanda/i18n'],
};

export default nextConfig;
