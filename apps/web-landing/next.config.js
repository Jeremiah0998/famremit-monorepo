/** @type {import('next').NextConfig} */
const nextConfig = {
  // We no longer need transpilePackages, which is correct.
  
  // This is the critical part that must remain.
  // It tells Next.js how to handle 'react-native' for the web.
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Alias 'react-native' to 'react-native-web'
      "react-native$": "react-native-web",
    };
    config.resolve.extensions = [
      ".web.js",
      ".web.jsx",
      ".web.ts",
      ".web.tsx",
      ...config.resolve.extensions,
    ];
    return config;
  },
};

module.exports = nextConfig;