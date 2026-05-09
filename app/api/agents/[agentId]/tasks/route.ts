import { NextRequest, NextResponse } from "next/server";
import type { AgentId, AgentTaskInput, DimensionSelection } from "@/types";
import { createTask, createTaskFromSelections } from "@/lib/orchestrator";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const body = (await req.json()) as {
    input?: AgentTaskInput;
    topic?: string;
    selections?: DimensionSelection[];
    modelId?: string;
  };

  try {
    const task =
      body.topic && body.selections
        ? await createTaskFromSelections(agentId as AgentId, body.topic, body.selections, body.modelId)
        : await createTask(agentId as AgentId, body.input!, body.modelId);
    return NextResponse.json({ task });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 400 }
    );
  }
}
