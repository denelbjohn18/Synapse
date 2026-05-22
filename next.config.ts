import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel Functions in api/ coexist with Next.js on Vercel.
  // No rewrites needed — Vercel routes them separately.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
