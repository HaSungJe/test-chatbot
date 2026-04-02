import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  trailingSlash: true,
  serverExternalPackages: ['@xenova/transformers', 'pdf-parse'],
};

export default nextConfig;
