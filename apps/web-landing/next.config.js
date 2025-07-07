/** @type {import('next').NextConfig} */
const nextConfig = {
  // This tells Next.js to look inside our shared UI package and compile it.
  transpilePackages: ["@famremit/ui"],

  // This is the critical part that translates 'react-native' for the web.
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Force all imports of 'react-native' to be resolved to 'react-native-web'
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