import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Only apply this for server-side builds
    if (isServer) {
      // Add sharp (and its dependencies if needed) as an external
      // This tells Webpack to leave it as a require() statement
      // instead of trying to bundle it.
      if (!config.externals) {
        config.externals = [];
      }

      config.externals.push('sharp'); 
      
      // For .node files, you might also need a specific loader rule
      // or to ensure they are correctly handled by the node-loader.
      // However, often marking the parent module as external is enough.
      // config.module.rules.push({
      //   test: /\.node$/,
      //   loader: 'node-loader',
      // });
    }
    return config;
  },
  /* config options here */
  trailingSlash: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
    
  },
  typescript: {
    ignoreBuildErrors: true,
  }
}

export default nextConfig
  