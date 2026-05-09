import { NextRequest } from "next/server";

export const runtime = "nodejs";

const OPENCODE_URL = process.env.OPENCODE_SERVER_URL || "http://127.0.0.1:4096";

async function createSession(): Promise<string> {
  const res = await fetch(`${OPENCODE_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error(`create session failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

async function sendMessage(sessionId: string, text: string): Promise<void> {
  const res = await fetch(`${OPENCODE_URL}/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parts: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`send message failed: ${res.status}`);
}

export async function POST(req: NextRequest) {
  const { message, images, sessionId: existingSessionId } = (await req.json()) as {
    message: string;
    images?: string[];
    sessionId?: string;
  };

  let prompt = message;
  if (images && images.length > 0) {
    prompt = `[用户附带了 ${images.length} 张图片]\n\n${message}`;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      let sessionId: string;
      try {
        sessionId = existingSessionId ?? (await createSession());
        send({ type: "session", sessionId });
      } catch (err) {
        send({ type: "error", message: `无法连接 opencode server：${err instanceof Error ? err.message : String(err)}` });
        controller.close();
        return;
      }

      const eventUrl = `${OPENCODE_URL}/event`;
      let eventRes: Response;
      try {
        eventRes = await fetch(eventUrl, { headers: { Accept: "text/event-stream" } });
      } catch (err) {
        send({ type: "error", message: `SSE 连接失败：${err instanceof Error ? err.message : String(err)}` });
        controller.close();
        return;
      }

      try {
        await sendMessage(sessionId, prompt);
      } catch (err) {
        send({ type: "error", message: `发送消息失败：${err instanceof Error ? err.message : String(err)}` });
        eventRes.body?.cancel();
        controller.close();
        return;
      }

      const reader = eventRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;

      while (!done) {
        const { value, done: streamDone } = await reader.read();
        if (streamDone) break;

        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine.slice(6)) as {
              type: string;
              properties?: {
                sessionID?: string;
                messageID?: string;
                partID?: string;
                field?: string;
                delta?: string;
              };
            };

            const props = event.properties;
            if (props?.sessionID && props.sessionID !== sessionId) continue;

            if (
              event.type === "message.part.delta" &&
              props?.field === "text" &&
              typeof props.delta === "string"
            ) {
              send({ type: "delta", text: props.delta });
            }

            if (event.type === "session.idle") {
              send({ type: "done" });
              done = true;
              break;
            }
          } catch {
            // ignored
          }
        }
      }

      reader.cancel();
      controller.close();
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
