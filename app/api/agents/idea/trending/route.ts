import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { webSearch } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个趋势洞察专家，擅长从搜索结果中捕捉最新热点、新兴需求和产品灵感。

你的任务：
1. 分析提供的搜索结果
2. 从中提取出有价值的关键词，作为"灵感种子"

输出格式要求：
先用自然语言简述你看到的趋势，然后在末尾输出结构化 JSON：

<IDEA_JSON>
{
  "trends": [
    {
      "category": "类别（如：AI 工具/健康科技/开发者工具/电商/SaaS）",
      "keywords": [
        {
          "keyword": "关键词",
          "reason": "为什么这个方向值得探索（一句话）",
          "heat": "hot/warm/cool"
        }
      ]
    }
  ]
}
</IDEA_JSON>

要求：
- 至少 3 个类别，每个类别 2-4 个关键词
- 关键词要具体可落地，不要太泛
- heat 表示当前热度：hot=最火 warm=有潜力 cool=冷门但有机会`;

async function gatherTrends(): Promise<string> {
  const queries = [
    "AI 工具 产品趋势 2025 ProductHunt",
    "开发者工具 新产品 创新 2025",
    "SaaS AI agent 产品 最新",
    "健康科技 电商 AI 创新趋势",
  ];

  const results = await Promise.all(queries.map((q) => webSearch(q, 5)));

  const parts: string[] = [];
  for (let i = 0; i < queries.length; i++) {
    const result = results[i];
    if (result.results.length) {
      parts.push(`## ${queries[i]}`);
      for (const r of result.results) {
        parts.push(`- [${r.title}](${r.url})${r.snippet ? `: ${r.snippet}` : ""}`);
      }
    }
  }
  return parts.join("\n");
}

export async function POST(req: NextRequest) {
  const { modelId } = (await req.json().catch(() => ({}))) as { modelId?: string };

  const context = await gatherTrends();

  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    prompt: `以下是最新搜索结果，请从中提取灵感关键词：\n\n${context}`,
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
