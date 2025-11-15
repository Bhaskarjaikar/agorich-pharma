import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Enable prefetching for faster navigation
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
    ],
  },
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    // This does NOT fix the underlying issues; it only prevents build failures.
    ignoreDuringBuilds: true,
  },
  turbopack: {
    // Explicitly set the workspace root to avoid multi-lockfile warnings.
    root: process.cwd(),
  },
};

export default nextConfig;
