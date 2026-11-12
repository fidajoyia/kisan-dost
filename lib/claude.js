// Minimal server-side client for the Anthropic Messages API.
const API_URL = "https://api.anthropic.com/v1/messages";

export function langInstruction(lang) {
  if (lang === "en") return "Write every human-readable text field in simple English.";
  if (lang === "roman")
    return "Write every human-readable text field in simple Roman Urdu (Urdu in Latin letters), the way Pakistani farmers text.";
  return "Write every human-readable text field in simple Urdu script that a Pakistani farmer understands. Keep scientific names in Latin.";
}

export async function askClaudeJSON({ text, images = [], maxTokens = 3000, tools }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error("ANTHROPIC_API_KEY is not set"), { status: 500 });

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

function parseJSON(s) {
  try { return JSON.parse(s); } catch {}
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1]); } catch {} }
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(s.slice(a, b + 1)); } catch {} }
  throw Object.assign(new Error("Model reply was not valid JSON"), { status: 502 });
}
