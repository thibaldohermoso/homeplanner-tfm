import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Windows puede bloquear los symlinks de pnpm al generar .next/standalone.
  // Docker y Vercel ejecutan Linux, donde mantenemos el output standalone.
  ...(process.platform === "win32" ? {} : { output: "standalone" }),
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
