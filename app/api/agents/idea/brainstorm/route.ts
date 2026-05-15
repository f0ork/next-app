import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { webSearch, fetchPageContent } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个产品经理级别的 Agent 设计专家，专门帮用户从一个模糊的关键词出发，设计出可落地的 AI Agent 产品。

你的工作流程：
1. 用户给你一个关键词 + 搜索结果
2. 基于搜索结果，提出 2-3 个 Agent 点子

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
</IDEA_JSON>`;

async function gatherContext(keyword: string): Promise<string> {
  const parts: string[] = [];

  const queries = [
    `${keyword} AI 产品 趋势 2025`,
    `${keyword} 用户痛点 解决方案`,
    `${keyword} agent 自动化 创新`,
  ];

  for (const q of queries) {
    const result = await webSearch(q, 5);
    if (result.results.length) {
      parts.push(`## 搜索: ${q}`);
      for (const r of result.results) {
        parts.push(`- [${r.title}](${r.url})${r.snippet ? `: ${r.snippet}` : ""}`);
      }
    }
  }

  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  const { keyword, modelId } = (await req.json()) as { keyword: string; modelId?: string };
  if (!keyword?.trim()) {
    return new Response(JSON.stringify({ error: "keyword required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = await gatherContext(keyword.trim());

  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    prompt: `关键词：${keyword.trim()}\n\n以下是搜索结果：\n${context}\n\n基于以上信息，提出 2-3 个 Agent 点子。`,
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
