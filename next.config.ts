import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Requerido para Docker: genera un servidor minimal standalone (~50MB)
  // en vez de requerir node_modules completos en producción.
  output: 'standalone',
};

export default nextConfig;
