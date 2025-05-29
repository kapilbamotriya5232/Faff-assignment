/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark native modules as external so Webpack doesn't try to bundle them.
      // They will be resolved at runtime by Node.js.
      if (!config.externals) {
        config.externals = [];
      }
      config.externals.push('sharp');
      config.externals.push('onnxruntime-node');

      // Optional: General rule for .node files if the above isn't sufficient
      // for all native addons. Next.js typically handles this well if the
      // parent modules are correctly externalized.
      // if (!config.module.rules.find(rule => rule.test && rule.test.toString().includes('\.node$'))) {
      //   config.module.rules.push({
      //     test: /\.node$/,
      //     loader: 'node-loader',
      //     options: {
      //       name: '[name].[ext]',
      //     },
      //   });
      // }
    }
    return config;
  },
  // Add other Next.js configurations here if you have them
  // For example:
  // reactStrictMode: true,
  // swcMinify: true,
};

module.exports = nextConfig; 