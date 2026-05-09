import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeResult } from "@/types";
import * as oc from "@/lib/opencode/client";

export const runtime = "nodejs";

const buildPrompt = (topic: string) =>
  `你是一个调研需求分析专家。用户想调研：「${topic}」

任务：分析这个调研需求，拆解出 3-5 个关键收集维度，每个维度提供 3-6 个具体选项。

必须严格按以下 JSON 格式输出，<ANALYZE_JSON> 标签前后不要有任何其他文字：

<ANALYZE_JSON>
{
  "topic": "规范化后的调研主题（不超过20字）",
  "summary": "一句话说明这个调研的核心价值（不超过50字）",
  "dimensions": [
    {
      "id": "dim_1",
      "question": "维度问题（例：你最关注哪些对比维度？）",
      "hint": "说明为何需要这个信息",
      "multiple": true,
      "options": [
        { "value": "v1", "label": "选项", "description": "一句话描述" }
      ]
    }
  ]
}
</ANALYZE_JSON>

维度设计原则：维度从宏观到细节，先确认调研范围，再定关注重点。选项要具体可操作，避免模糊表达。`;

export async function POST(req: NextRequest) {
  const { topic } = (await req.json()) as { topic: string };
  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const sessionId = await oc.createSession();
  let fullText = "";
  let resolveStream!: () => void;

  const waitDone = new Promise<void>((res) => { resolveStream = res; });

  const streamPromise = oc.streamSession(sessionId, {
    onDelta: (d) => { fullText += d; },
    onDone: () => resolveStream(),
    onError: () => resolveStream(),
  });

  setTimeout(() => {
    void oc.sendMessage(sessionId, buildPrompt(topic.trim()));
  }, 80);

  await Promise.race([waitDone, streamPromise]);

  const raw = oc.extractJsonBlock(fullText, "ANALYZE_JSON") as AnalyzeResult | null;
  if (!raw?.dimensions?.length) {
    return NextResponse.json({ error: "AI 分析失败，请重试" }, { status: 500 });
  }

  return NextResponse.json({ result: raw });
}
