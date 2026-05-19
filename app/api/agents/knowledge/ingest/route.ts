import { NextRequest, NextResponse } from "next/server";
import { extractText, chunkText, buildEntry } from "@/lib/kb/processor";
import { saveEntry } from "@/lib/kb/store";
import { callAI } from "@/lib/ai/client";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { content, inputType = "text" } = (await req.json()) as {
    content: string;
    inputType?: "text" | "url" | "file";
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const { title, content: extracted } = await extractText(content.trim(), inputType);

  const summaryPrompt = `请对以下内容进行总结和分类，输出 JSON：

内容：
${extracted.slice(0, 3000)}

输出格式（严格 JSON，无其他文字）：
{"summary":"一句话摘要（不超过100字）","category":"分类（如：技术/产品/市场/工具/概念）","tags":["标签1","标签2","标签3"]}`;

  const aiResult = await callAI(summaryPrompt);
  let summary = extracted.slice(0, 100);
  let category = "未分类";
  let tags: string[] = [];

  try {
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary ?? summary;
      category = parsed.category ?? category;
      tags = parsed.tags ?? tags;
    }
  } catch { /* ignored */ }

  const chunks = chunkText(extracted);
  const entries = [];

  for (const chunk of chunks) {
    const entry = buildEntry(title, chunk, summary, category, tags, content.trim(), inputType);
    await saveEntry(entry);
    entries.push({ id: entry.id, title: entry.title, category: entry.category });
  }

  return NextResponse.json({
    ok: true,
    title,
    category,
    tags,
    summary,
    chunks: entries.length,
  });
}
