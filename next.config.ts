import type { NextConfig } from "next";

const isMobileStaticExport = process.env.CAPACITOR_BUILD === "true";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Static export cannot use the default image optimizer; skip optimization in mobile builds
    unoptimized: isMobileStaticExport,
  },
  // Enable prefetching for faster navigation
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.31.112", "0.0.0.0", "localhost"],
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
    ],
  },
  // Capacitor (Android) wraps the static `out/` directory. The web build keeps
  // its full server-side capability (API routes, middleware, SSR). Setting this
  // flag via `CAPACITOR_BUILD=true` is what triggers the static export path.
  output: isMobileStaticExport ? "export" : undefined,
  trailingSlash: isMobileStaticExport ? true : false,
  // `headers` and `redirects` are not supported under `output: "export"`.
  // They are kept active for the regular web build only.
  ...(isMobileStaticExport
    ? {}
    : {
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
      }),
  turbopack: {
    // Explicitly set the workspace root to avoid multi-lockfile warnings.
    root: process.cwd(),
  },
};

export default nextConfig;
