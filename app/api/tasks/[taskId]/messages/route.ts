import { NextRequest, NextResponse } from "next/server";
import { loadMessages } from "@/lib/store";
import { sendUserMessage } from "@/lib/orchestrator";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  return NextResponse.json({ messages: loadMessages(taskId) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const { content } = (await req.json()) as { content: string };

  try {
    await sendUserMessage(taskId, content);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 400 }
    );
  }
}
