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
    // Disable PostCSS by removing the loader
    config.module.rules = config.module.rules.map(rule => {
      if (rule.oneOf) {
        rule.oneOf = rule.oneOf.map(oneOfRule => {
          if (oneOfRule.use && Array.isArray(oneOfRule.use)) {
            oneOfRule.use = oneOfRule.use.filter(loader => 
              !loader.loader || !loader.loader.includes('postcss-loader')
            );
          }
          return oneOfRule;
        });
      }
      return rule;
    });
    return config;
  }
};

module.exports = nextConfig; 