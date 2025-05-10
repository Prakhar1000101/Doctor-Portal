/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Remove or comment out this line
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
