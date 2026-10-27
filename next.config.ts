import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing was built at /welcome and now lives at /; old links keep working.
  redirects() {
    return [{ source: "/welcome", destination: "/", permanent: false }];
  },
};

export default nextConfig;
