import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Windows puede bloquear los symlinks de pnpm al generar .next/standalone.
  // Docker y Vercel ejecutan Linux, donde mantenemos el output standalone.
  ...(process.platform === "win32" ? {} : { output: "standalone" }),
};

export default nextConfig;
