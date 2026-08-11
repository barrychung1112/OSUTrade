/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "kigqkrmjzwqrxlpoukfb.supabase.co",
      "placehold.co",
    ],
    minimumCacheTTL: 2_592_000,
  },
};

module.exports = nextConfig;
