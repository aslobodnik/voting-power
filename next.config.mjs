/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "metadata.ens.domains",
        port: "",
        pathname: "/mainnet/avatar/**",
      },
      // Keep any existing patterns here
    ],
  },
};

export default nextConfig;
