import { NextRequest, NextResponse } from "next/server";
import { searchVectors, getEntry } from "@/lib/kb/store";
import { callAI } from "@/lib/ai/client";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const { question } = (await req.json()) as { question: string };
  if (!question?.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const matches = await searchVectors(question.trim(), 5);
  const relevantEntries = matches
    .map((m) => getEntry(m.id))
    .filter((e): e is NonNullable<typeof e> => e != null);

  if (relevantEntries.length === 0) {
    return NextResponse.json({
      answer: "知识库中没有找到相关信息。请先添加一些内容。",
      sources: [],
    });
  }

  const context = relevantEntries
    .map((e, i) => `[来源${i + 1}] ${e.title}\n${e.summary}\n${e.content.slice(0, 500)}`)
    .join("\n\n");

  const systemPrompt = `你是一个知识库问答助手。基于以下知识库内容回答用户问题。

知识库内容：
${context}

规则：
- 只基于提供的内容回答，不编造
- 回答时引用来源编号如 [来源1]
- 如果内容不足以回答，诚实说明`;

  const answer = await callAI(question.trim(), systemPrompt, undefined, "knowledge", userId);

  return NextResponse.json({
    answer,
    sources: relevantEntries.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
    })),
  });
}
