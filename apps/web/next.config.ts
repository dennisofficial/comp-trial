import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  // @repo/db ships TypeScript source (including the generated Prisma client),
  // so Next has to compile it rather than treat it as a prebuilt dependency.
  transpilePackages: ['@repo/db'],
};

export default nextConfig;
