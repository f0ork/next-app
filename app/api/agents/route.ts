import { NextResponse } from "next/server";
import { listAgents } from "@/lib/agents/registry";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(listAgents().map((a) => ({
    id: a.id,
    name: a.name,
    description: a.description,
    version: a.version,
    ui: a.ui,
    intake: { fields: a.intake.fields },
  })));
}
