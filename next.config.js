/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/images/**',
      },
    ],
  },

  // Disable type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optimize build performance
  experimental: {
    optimizeCss: false,
  },

  // Ensure proper handling of base URL
  basePath: '',
  assetPrefix: '',

  // Optimize bundle size
  webpack: (config, { isServer }) => {
    // Handle JSON files
    config.module.rules.push({
      test: /\.json$/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
      use: [
        {
          loader: 'json-loader',
          options: {
            esModule: false,
          },
        },
      ],
    });

    // Add specific rule for tr46 mappingTable.json
    config.module.rules.push({
      test: /tr46\/lib\/mappingTable\.json$/,
      type: 'javascript/auto',
      use: [
        {
          loader: 'json-loader',
          options: {
            esModule: false,
          },
        },
      ],
    });

    // Add aliases for problematic packages
    config.resolve.alias = {
      ...config.resolve.alias,
      'tr46': require.resolve('tr46'),
      'whatwg-url': require.resolve('whatwg-url'),
    };

    return config;
  },

  // Reduce the number of pages being generated
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Optimize static generation
  generateEtags: false,
  poweredByHeader: false,

  // Ensure proper handling of trailing slashes
  trailingSlash: false,
};

module.exports = nextConfig; 