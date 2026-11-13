import { hasAI } from "@/lib/claude";
// Which optional services are configured, so the app can say so instead of failing silently.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ai: hasAI() });
}
