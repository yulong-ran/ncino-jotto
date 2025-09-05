import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Set base path for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/ncino-jotto' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/ncino-jotto/' : '',
};

export default nextConfig;
