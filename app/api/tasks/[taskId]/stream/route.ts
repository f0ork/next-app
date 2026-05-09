import { NextRequest } from "next/server";
import { subscribe } from "@/lib/orchestrator";
import { loadTask } from "@/lib/store";
import type { TaskEvent } from "@/types";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const task = loadTask(taskId);
  if (!task) {
    return new Response("task not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: TaskEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // ignored
        }
      };

      const unsub = subscribe(taskId, send);

      req.signal.addEventListener("abort", () => {
        unsub();
        try { controller.close(); } catch { /* ignored */ }
      });

      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ taskId, phase: task.phase })}\n\n`)
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
