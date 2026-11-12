import { askClaudeJSON, langInstruction } from "@/lib/claude";
import { weatherForPrompt, locationForPrompt } from "@/lib/weather-text";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

// Runs automatically once location + live weather are known (no photo needed):
// regional crop-disease alerts for the coming weeks + a 17–30 day climate estimate.
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }

  const prompt = `You are an agricultural meteorologist and plant pathologist advising small farmers in Pakistan / South Asia.

${locationForPrompt(body.location)}
${weatherForPrompt(body.weather)}

Tasks:
1. alerts: for the main crops and orchards grown in this area at this time of year, list up to 5 disease or pest threats that this LIVE weather favours in the next 16 days. Give crop, threat, level low/medium/high, the weather reason with dates/numbers, and one action.
2. outlook_17_30: the live forecast covers 16 days. Give 2 entries (days 17–23 and 24–30) estimated from typical climate for this place and season; say in "note" that it is a climate estimate.
3. irrigation: a one-line general irrigation note for this area this week from the soil moisture, rain and ET0 numbers.
4. farm_tips: up to 4 short seasonal tips (sowing, spray timing, fog/frost/heat care).

${langInstruction(body.lang)}

Reply with ONLY one JSON object:
{"alerts":[{"crop":"","threat":"","level":"low|medium|high","reason":"","action":""}],
 "outlook_17_30":[{"label":"","dates":"","tmax":0,"tmin":0,"humidity":0,"rain":"low|medium|high","note":"","disease_risk":""}],
 "irrigation":"",
 "farm_tips":[""]}`;

  try {
    return Response.json(await askClaudeJSON({ text: prompt, maxTokens: 2500 }));
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}
