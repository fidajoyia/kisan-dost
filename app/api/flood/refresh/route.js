import { revalidateTag } from "next/cache";
import { warmFlood } from "@/lib/flood";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Daily cron (vercel.json): drop cached flood data so new forecasts, dam levels and ENSO are used,
// then rebuild the expensive history in the background budget so visitors get it instantly.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });
  revalidateTag("flood");
  const warm = await warmFlood().catch((e) => ({ error: e.message }));
  return Response.json({ refreshed: new Date().toISOString(), warm });
}
