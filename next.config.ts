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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdn.razorpay.com https://www.gstatic.com https://firebaseinstallations.googleapis.com https://fcmclient.googleapis.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*; connect-src 'self' https://* https://www.gstatic.com https://firebaseinstallations.googleapis.com https://fcmclient.googleapis.com; frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com;",
          },
        ],
      },
    ];
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
