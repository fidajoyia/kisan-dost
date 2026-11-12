import { revalidateTag } from "next/cache";
import { cropCounts } from "@/lib/seed-intel";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Weekly cron (vercel.json): re-check every institution for newly registered varieties and redo the
// web research, so new seeds enter the comparison automatically.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  revalidateTag("seeds");
  const c = await cropCounts().catch((e) => ({ error: e.message }));
  return Response.json({ refreshed: new Date().toISOString(), ...c });
}
