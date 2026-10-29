import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Preserve return URLs already issued to payment sessions.
      { source: "/reserve/confirmed", destination: "/reservehide/confirmed", permanent: false },
      { source: "/reservation", destination: "/reservehide", permanent: false },
    ];
  },
};

export default nextConfig;
