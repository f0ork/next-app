const OPENCODE_URL = process.env.OPENCODE_SERVER_URL ?? "http://127.0.0.1:4096";

const DEFAULT_MODEL_ID =
  process.env.OPENCODE_MODEL_ID ?? "Mify-Xiaomi/xiaomi/mimo-v2.5-pro";

function parseModelId(fullId: string): { id: string; providerID: string } {
  const parts = fullId.split("/");
  const providerID = parts[0];
  return { id: fullId, providerID };
}

export async function createSession(modelId?: string): Promise<string> {
  const model = parseModelId(modelId ?? DEFAULT_MODEL_ID);
  const res = await fetch(`${OPENCODE_URL}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model }),
  });
  if (!res.ok) throw new Error(`opencode create session failed: ${res.status}`);
  const data = (await res.json()) as { id: string };
  return data.id;
}

export async function sendMessage(sessionId: string, text: string): Promise<void> {
  const res = await fetch(`${OPENCODE_URL}/session/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parts: [{ type: "text", text }] }),
  });
  if (!res.ok) throw new Error(`opencode send message failed: ${res.status}`);
}

export interface OpencodeEventHandler {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}

export async function streamSession(
  sessionId: string,
  handler: OpencodeEventHandler,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${OPENCODE_URL}/event`, {
    headers: { Accept: "text/event-stream" },
    signal,
  });
  if (!res.ok || !res.body) throw new Error(`opencode event stream failed: ${res.status}`);

  const reader = res.body.getReader();
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
          properties?: { sessionID?: string; field?: string; delta?: string };
        };
        const props = event.properties;
        if (props?.sessionID && props.sessionID !== sessionId) continue;

        if (event.type === "message.part.delta" && props?.field === "text" && props.delta) {
          handler.onDelta(props.delta);
        }
        if (event.type === "session.idle") {
          handler.onDone();
          done = true;
          break;
        }
      } catch {
        // ignored
      }
    }
  }
  reader.cancel();
}

export function extractJsonBlock(text: string, tag: string): unknown | null {
  const open = `<${tag}>`;
  const close = `</${tag}>`;
  const start = text.indexOf(open);
  const end = text.indexOf(close);
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start + open.length, end).trim());
  } catch {
    return null;
  }
}
