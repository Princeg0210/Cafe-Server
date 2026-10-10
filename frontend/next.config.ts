import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const upstream = (process.env.API_UPSTREAM_URL || "https://cafe-piza-api.onrender.com").replace(/\/$/, "");
    return [{ source: "/api/v1/:path*", destination: `${upstream}/api/v1/:path*` }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
