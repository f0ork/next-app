import { NextRequest } from "next/server";
import { streamText, stepCountIs } from "ai";
import { getModel, researchTools } from "@/lib/ai/client";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个产品经理级别的 Agent 设计专家，专门帮用户从一个模糊的关键词出发，设计出可落地的 AI Agent 产品。

你的工作流程：
1. 用户给你一个关键词
2. 你用 web_search 工具搜索相关的趋势、痛点、现有解决方案
3. 基于搜索结果，提出 2-3 个 Agent 点子

每个 Agent 点子必须包含：
- 名称（简短有力）
- 一句话描述
- 目标用户
- 核心功能（3-5 个）
- 与现有 Agent 的区别
- 技术可行性评估

输出格式要求：
先用自然语言分析搜索结果和思路，然后在末尾输出结构化 JSON：

<IDEA_JSON>
{
  "keyword": "用户输入的关键词",
  "analysis": "基于搜索结果的分析摘要",
  "ideas": [
    {
      "id": "idea_1",
      "name": "Agent 名称",
      "description": "一句话描述",
      "targetUser": "目标用户",
      "features": ["功能1", "功能2", "功能3"],
      "differentiator": "与现有 Agent 的区别",
      "feasibility": "high/medium/low",
      "techStack": ["技术点1", "技术点2"]
    }
  ]
}
</IDEA_JSON>

重要：必须用 web_search 工具搜索至少 2-3 次，确保点子有现实依据。`;

export async function POST(req: NextRequest) {
  const { keyword, modelId } = (await req.json()) as { keyword: string; modelId?: string };
  if (!keyword?.trim()) {
    return new Response(JSON.stringify({ error: "keyword required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const result = streamText({
    model: getModel(modelId ?? "ppio/pa/claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    prompt: `关键词：${keyword.trim()}\n\n请搜索相关趋势和痛点，提出 2-3 个 Agent 点子。`,
    tools: researchTools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
