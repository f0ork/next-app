import { NextResponse } from "next/server";
import { getEnabledAgents } from "@/lib/agents/registry";

export const runtime = "nodejs";

export async function GET() {
  const agents = await getEnabledAgents();
  return NextResponse.json(agents.map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    icon: a.ui?.icon ?? "🤖",
    color: a.ui?.themeColor ?? "from-gray-500 to-gray-600",
  })));
}
