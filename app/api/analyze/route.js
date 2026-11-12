import { askClaudeJSON, langInstruction } from "@/lib/claude";
import { weatherForPrompt, locationForPrompt } from "@/lib/weather-text";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SHAPE = `{"is_plant":true,
 "plant":{"name_local":"","name_en":"","scientific":"","category":"","part_seen":"","growth_stage":"","confidence":0},
 "health":{"status":"healthy|early|moderate|severe","label":"","score":0},
 "diseases":[{"name_local":"","name_en":"","pathogen":"","confidence":0,"stage":"","signs":[""]}],
 "risks":[{"name_local":"","name_en":"","level":"low|medium|high","reason":"","when":""}],
 "irrigation":{"advice":"","next_watering":"","method_tip":""},
 "outlook_17_30":[{"label":"","dates":"","tmax":0,"tmin":0,"humidity":0,"rain":"low|medium|high","note":"","disease_risk":""}],
 "treatment":{"organic":[""],"chemical":[""],"cultural":[""]},
 "prevention":[""],
 "image_note":"",
 "advice":""}`;

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return Response.json({ error: "bad request" }, { status: 400 }); }
  const images = (body.images || []).slice(0, 3).filter((x) => typeof x?.data === "string" && x.data.length < 8_000_000);
  if (!images.length) return Response.json({ error: "no image" }, { status: 400 });

  const prompt = `You are an expert plant pathologist and agronomist advising small farmers in Pakistan / South Asia.
The attached image(s) show part of a plant (usually a leaf; may be front and back of the same leaf).

${locationForPrompt(body.location)}
${weatherForPrompt(body.weather)}

Tasks:
1. Identify the plant: local name, English name, scientific name, category (crop / tree / fruit tree / vegetable / weed / ornamental / other), and growth stage if visible. If the photo is not a plant, set is_plant=false.
2. Judge health. Look carefully for EARLY, subtle symptoms (small specks, slight chlorosis, faint lesions, underside spores/mites, insect eggs) a farmer might miss.
3. List likely diseases or pests visible now, most likely first, with honest confidence 0–100. Do not invent a disease if the leaf looks healthy. Name the pathogen type.
4. EARLY WARNING: from this crop, the location and the LIVE weather above (temperature, humidity, rain, hours of RH≥90%), list diseases this crop is at risk of in the next 16 days even if not visible yet: risk low/medium/high, the specific weather reason (cite the dates/numbers), and the time window.
5. IRRIGATION: using the soil moisture, ET0 deficit, upcoming rain and this crop's water needs at this stage, say whether and when to irrigate. Note that soil moisture is a model estimate and the soil type is unknown. Mention that excess watering raises fungal risk when relevant.
6. DAYS 17–30: the live forecast covers only 16 days. Give 2 entries (days 17–23 and 24–30) estimated from typical climate for this place and season; say in "note" it is a climate estimate.
7. Treatment: organic/home steps, chemical options by ACTIVE INGREDIENT or group only (no brand names, no dose numbers; say "dose per label"), and cultural practices.
8. Prevention steps.
If the image is blurry, too far, or ambiguous, say so in image_note and lower confidence.

${langInstruction(body.lang)}

Reply with ONLY one JSON object in exactly this shape:
${SHAPE}
health.score: 100 = fully healthy. Keep lists short (max 4 diseases, max 4 risks, max 4 items per list).`;

  try {
    const data = await askClaudeJSON({ text: prompt, images, maxTokens: 4000 });
    return Response.json(data);
  } catch (e) {
    return Response.json({ error: e.message }, { status: e.status || 500 });
  }
}
