import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
    ];
    return [
      { source: "/api/patient/:path*", headers: cors },
      { source: "/api/consultations/:path*", headers: cors },
      { source: "/api/auth/mobile/:path*", headers: cors },
      { source: "/api/patient/portal/:path*", headers: cors },
    ];
  },
  async redirects() {
    return [
      { source: "/dashboard", destination: "/", permanent: true },
      { source: "/dashboard/:path+", destination: "/:path+", permanent: true },
      { source: "/inicio-sesion", destination: "/signin", permanent: false },
      { source: "/registro", destination: "/signup", permanent: false },
    ];
  },
};

export default nextConfig;
