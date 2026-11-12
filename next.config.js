/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // pdf.js (inside unpdf) must not be bundled by webpack; it reads the Flood Commission's PDF reports
  experimental: { serverComponentsExternalPackages: ["unpdf"] },
};
