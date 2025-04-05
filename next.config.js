/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        pathname: '/images/**',
      },
    ],
  },
  webpack: (config) => {
    // Handle JSON files
    config.module.rules.push({
      test: /\.json$/,
      type: 'javascript/auto',
    });

    return config;
  },
};

module.exports = nextConfig; 