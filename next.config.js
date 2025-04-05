/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static optimization where possible
  reactStrictMode: true,
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['m.media-amazon.com'],
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
  webpack: (config) => {
    // Handle JSON files
    config.module.rules.push({
      test: /\.json$/,
      type: 'javascript/auto',
    });

    return config;
  },

  // Reduce the number of pages being generated
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  
  // Optimize static generation
  generateEtags: false,
  poweredByHeader: false,

  // Ensure proper handling of trailing slashes
  trailingSlash: false,

  // Ensure proper handling of rewrites
  async rewrites() {
    return [
      {
        source: '/:path*',
        destination: '/:path*',
      },
    ];
  },
}

module.exports = nextConfig 