const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['m.media-amazon.com'],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },

  // Optimize build performance
  experimental: {
    optimizeCss: false,
  },

  // Optimize bundle size
  webpack: (config, { dev, isServer }) => {
    // Exclude unnecessary files
    config.module.rules.push({
      test: /\.(csv|json|txt|md|py|ipynb|db|sqlite|sqlite3)$/,
      exclude: /node_modules/,
      use: 'null-loader',
    });

    // Optimize bundle size
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          cacheGroups: {
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
            default: {
              minChunks: 2,
              priority: -20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': `${__dirname}/src`,
      '@/lib': `${__dirname}/src/lib`,
      '@/types': `${__dirname}/src/types`,
      '@/app/utils': `${__dirname}/src/app/utils`,
    };

    // Disable critters for now
    config.optimization.minimizer = config.optimization.minimizer.filter(
      (minimizer) => minimizer.constructor.name !== 'Critters'
    );

    return config;
  },

  // Reduce the number of pages being generated
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Optimize static generation
  generateEtags: false,
  poweredByHeader: false,
  output: 'standalone',
}

module.exports = nextConfig 