import { NextRequest, NextResponse } from "next/server";
import type { AnalyzeResult } from "@/types";
import { callAI } from "@/lib/ai/client";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个调研需求分析专家。用户会给你一个调研主题，你需要分析这个主题，拆解出 3-5 个关键收集维度，每个维度提供 3-6 个具体选项。

输出格式（严格遵守）：

在回复的最后，输出一个 JSON 数据块：

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
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const { topic } = (await req.json()) as { topic: string };
  if (!topic?.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const fullText = await callAI(
    `用户想调研：「${topic.trim()}」\n\n请分析需求并输出维度选项。`,
    SYSTEM_PROMPT,
    undefined,
    "research",
    userId
  );

  const raw = extractJsonBlock(fullText, "ANALYZE_JSON") as AnalyzeResult | null;
  if (!raw?.dimensions?.length) {
    return NextResponse.json({ error: "AI 分析失败，请重试" }, { status: 500 });
  }

  return NextResponse.json({ result: raw });
}

function extractJsonBlock(text: string, tag: string): unknown | null {
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
