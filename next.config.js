/** @type {import('next').NextConfig} */
// one id per build: baked into the phone's page and returned by /api/version, so an old open page can tell it is out of date
const gitSha = () => { try { return require("child_process").execSync("git rev-parse HEAD").toString().trim(); } catch { return "dev"; } };
const APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA || gitSha();
module.exports = {
  reactStrictMode: true,
  env: { APP_VERSION },
  // pdf.js (inside unpdf) must not be bundled by webpack; it reads the Flood Commission's PDF reports
  experimental: { serverComponentsExternalPackages: ["unpdf"] },
  // the on-phone leaf model and its runtime: let phones keep them for a week instead of downloading again
  async headers() {
    const week = [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }];
    return [{ source: "/models/:path*", headers: week }, { source: "/ort/:path*", headers: week }];
  },
};
