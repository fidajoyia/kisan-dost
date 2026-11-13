import { weatherAlerts } from "@/lib/disease-rules";

export const dynamic = "force-dynamic";

// Area disease / pest warnings for the next 16 days, from the live forecast and a crop calendar.
// Rule based: no AI service and no key needed.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  if (!body?.weather?.days?.length) return Response.json({ error: "no weather" }, { status: 400 });
  return Response.json(weatherAlerts(body.weather));
}
