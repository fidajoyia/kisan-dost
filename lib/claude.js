// Minimal server-side AI client. Uses Claude (ANTHROPIC_API_KEY) if set, otherwise Google Gemini
// (GEMINI_API_KEY, free tier available at aistudio.google.com). Same JSON-in / JSON-out for both.
const API_URL = "https://api.anthropic.com/v1/messages";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const hasAI = () => !!(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);

export function langInstruction(lang) {
  if (lang === "en") return "Write every human-readable text field in simple English.";
  if (lang === "roman")
    return "Write every human-readable text field in simple Roman Urdu (Urdu in Latin letters), the way Pakistani farmers text.";
  return "Write every human-readable text field in simple Urdu script that a Pakistani farmer understands. Keep scientific names in Latin.";
}

export async function askClaudeJSON({ text, images = [], maxTokens = 3000, tools }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    if (process.env.GEMINI_API_KEY) return askGeminiJSON({ text, images, maxTokens, tools });
    throw Object.assign(new Error("AI_NOT_CONFIGURED"), { status: 503, code: "AI_NOT_CONFIGURED" });
  }

  const content = [
    ...images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType || "image/jpeg", data: img.data },
    })),
    { type: "text", text },
  ];

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
      ...(tools ? { tools } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw Object.assign(new Error(`Anthropic API ${res.status}: ${body.slice(0, 300)}`), { status: 502 });
  }
  const data = await res.json();
  const texts = (data.content || []).filter((b) => b.type === "text").map((b) => b.text);
  // With server tools (web search) the answer can be split into several text blocks; the JSON is in the last part.
  try { return parseJSON(texts.join("")); } catch (e) {
    for (let i = texts.length - 1; i >= 0; i--) { try { return parseJSON(texts.slice(i).join("")); } catch {} }
    throw e;
  }
}

async function askGeminiJSON({ text, images, maxTokens, tools }) {
  const search = (tools || []).some((t) => /web_search/.test(t.type || t.name || ""));
  const models = [...new Set([process.env.GEMINI_MODEL || "gemini-flash-latest", "gemini-2.5-flash"])];
  let last;
  for (const model of models) {
    const res = await fetch(`${GEMINI_URL}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          ...images.map((img) => ({ inline_data: { mime_type: img.mediaType || "image/jpeg", data: img.data } })),
          { text },
        ] }],
        // thinking models spend part of the output budget on reasoning, so allow more room
        generationConfig: { maxOutputTokens: Math.max(8192, maxTokens * 3), ...(search ? {} : { responseMimeType: "application/json" }) },
        ...(search ? { tools: [{ google_search: {} }] } : {}),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const out = (data.candidates?.[0]?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
      return parseJSON(out);
    }
    last = `Gemini API ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`;
    if (res.status !== 404) break; // only an unknown model name is worth retrying with the next one
  }
  throw Object.assign(new Error(last), { status: 502 });
}

function parseJSON(s) {
  try { return JSON.parse(s); } catch {}
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  throw Object.assign(new Error("Model reply was not valid JSON"), { status: 502 });
}
