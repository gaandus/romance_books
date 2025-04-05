/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
    ],
    domains: ['romance.io'],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Disable PostCSS processing
    config.module.rules.forEach(rule => {
      if (rule.oneOf) {
        rule.oneOf.forEach(oneOfRule => {
          if (oneOfRule.use && oneOfRule.use.some(use => use.loader && use.loader.includes('postcss-loader'))) {
            oneOfRule.use = oneOfRule.use.filter(use => !use.loader || !use.loader.includes('postcss-loader'));
          }
        });
      }
    });
    return config;
  }
};

module.exports = nextConfig; 