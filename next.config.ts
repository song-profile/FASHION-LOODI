import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/api/:path*", headers: [
      { key: "Access-Control-Allow-Origin", value: "capacitor://localhost" },
      { key: "Access-Control-Allow-Methods", value: "POST, DELETE, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
      { key: "Vary", value: "Origin" },
    ] }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "ferf1mheo22r9ira.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
