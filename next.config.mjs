/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  output: 'standalone',
  turbopack: {
    resolveAlias: {
      perf_hooks: './src/empty-perf-hooks.js',
    },
  },
};

export default nextConfig;