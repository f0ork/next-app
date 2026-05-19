import { randomUUID } from "crypto";
import type { KBEntry } from "./store";

export async function extractText(input: string, inputType: "text" | "url" | "file"): Promise<{ title: string; content: string }> {
  if (inputType === "text") {
    return {
      title: input.slice(0, 50) + (input.length > 50 ? "…" : ""),
      content: input,
    };
  }

  if (inputType === "url") {
    return fetchUrl(input);
  }

  return { title: "文件", content: input };
}

async function fetchUrl(url: string): Promise<{ title: string; content: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; KBBot/1.0)" },
    });
    if (!res.ok) return { title: url, content: `HTTP ${res.status}` };
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : url;
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);
    return { title, content: text };
  } catch {
    return { title: url, content: "无法访问该链接" };
  }
}

export function chunkText(text: string, maxLen = 800): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[。！？.!?\n])\s*/);
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = s;
    } else {
      current += (current ? " " : "") + s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text.slice(0, maxLen)];
}

export function buildEntry(
  title: string,
  content: string,
  summary: string,
  category: string,
  tags: string[],
  source: string,
  sourceType: "text" | "url" | "file"
): KBEntry {
  const now = new Date().toISOString();
  return {
    id: randomUUID().slice(0, 12),
    title,
    content,
    summary,
    category,
    tags,
    source,
    sourceType,
    createdAt: now,
    updatedAt: now,
  };
}
