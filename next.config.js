/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    // Handle reusify package
    config.resolve.alias = {
      ...config.resolve.alias,
      'reusify': false
    };
    return config;
  }
};

module.exports = nextConfig; 