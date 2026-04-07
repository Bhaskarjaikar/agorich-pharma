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
  async redirects() {
    return [
      {
        source: "/shop",
        destination: "/",
        permanent: true,
      },
      {
        source: "/about-us",
        destination: "/",
        permanent: true,
      },
      {
        source: "/contact-us",
        destination: "/",
        permanent: true,
      },
      {
        source: "/categories",
        destination: "/",
        permanent: true,
      },
      {
        source: "/product/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/author/:slug*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/uncategorized/:slug*",
        destination: "/",
        permanent: true,
      },
    ];
  },
  turbopack: {
    // Explicitly set the workspace root to avoid multi-lockfile warnings.
    root: process.cwd(),
  },
};

export default nextConfig;
