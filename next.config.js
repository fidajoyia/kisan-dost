/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // pdf.js (inside unpdf) must not be bundled by webpack; it reads the Flood Commission's PDF reports
  experimental: { serverComponentsExternalPackages: ["unpdf"] },
  // the on-phone leaf model and its runtime: let phones keep them for a week instead of downloading again
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [{ source: "/models/:path*", headers: week }, { source: "/ort/:path*", headers: week }];
  },
};
