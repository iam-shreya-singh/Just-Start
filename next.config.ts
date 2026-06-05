// =============================================================================
// Next.js Configuration — Just Start (Phase 5)
// =============================================================================
// Production-optimized configuration for Vercel deployment.
// =============================================================================

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ---- Output Mode ----
  // "standalone" produces a self-contained output for Docker/custom servers.
  // Vercel auto-detects Next.js, so this is primarily for non-Vercel deploys.
  output: "standalone",

  // ---- React Strict Mode ----
  reactStrictMode: true,

  // ---- Image Optimization ----
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // ---- Compression ----
  // Vercel handles compression at the edge; disable Next.js-level compression
  // to avoid double-compression overhead.
  compress: false,

  // ---- Server External Packages ----
  // These packages are Node.js-native and should not be bundled by webpack.
  // This reduces bundle size and avoids bundling issues.
  serverExternalPackages: [
    "sharp",
    "@prisma/client",
  ],

  // ---- HTTP/2 Server Push / DNS Prefetch ----
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
        ],
      },
    ];
  },

  // ---- Experimental ----
  experimental: {
    // Optimize package imports to reduce bundle size
    // Tree-shakes unused exports from these large packages
    optimizePackageImports: [
      "lucide-react",
      "framer-motion",
    ],
  },
};

export default nextConfig;
