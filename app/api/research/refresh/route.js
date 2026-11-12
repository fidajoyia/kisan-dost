import { revalidateTag } from "next/cache";
import { getResearch } from "@/lib/research-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Called daily by the Vercel cron in vercel.json (or any scheduler: curl this URL).
// Drops the cached digest and rebuilds it, so newly published research shows up automatically.
// If CRON_SECRET is set, the request must send "Authorization: Bearer <CRON_SECRET>".
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  revalidateTag("research");
  const out = {};
  for (const lang of ["ur", "en"]) {
    try { const r = await getResearch(lang); out[lang] = { items: r.items.length, mode: r.mode, counts: r.counts }; }
    catch (e) { out[lang] = { error: e.message }; }
  }
  return Response.json({ refreshed: new Date().toISOString(), ...out });
}
