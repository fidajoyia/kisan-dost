// GET /api/version → id of the build now live (see next.config.js)
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ v: process.env.APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
}
