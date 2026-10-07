import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/reservation", destination: "/reserve", permanent: false },
    ];
  },
};

export default nextConfig;
