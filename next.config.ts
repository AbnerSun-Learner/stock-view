import type { NextConfig } from "next";

const AKSHARE_API_BASE = process.env.AKSHARE_API_URL || "http://localhost:5001";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/akshare/:path*",
        destination: `${AKSHARE_API_BASE}/api/akshare/:path*`,
      },
    ];
  },
};

export default nextConfig;
