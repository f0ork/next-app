import { NextRequest, NextResponse } from "next/server";
import type { AgentId, AgentTaskInput } from "@/types";
import { createTask } from "@/lib/orchestrator";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await req.json()) as { input: AgentTaskInput };

  try {
    const task = await createTask(agentId as AgentId, body.input);
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 400 }
    );
  }
}
