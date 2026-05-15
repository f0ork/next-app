import { NextRequest } from "next/server";
import { streamText, stepCountIs } from "ai";
import { getModel, researchTools } from "@/lib/ai/client";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个趋势洞察专家，擅长从互联网上捕捉最新热点、新兴需求和产品灵感。

你的任务：
1. 用 web_search 工具搜索最新的科技趋势、产品创新、用户痛点、行业动态
2. 搜索至少 3-5 次，覆盖不同角度（科技/产品/用户需求/行业/工具）
3. 从搜索结果中提取出有价值的关键词，作为"灵感种子"

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
- 关键词要具体可落地，不要太泛（"AI" 太泛，"AI 法律文书助手" 才好）
- heat 表示当前热度：hot=最火 warm=有潜力 cool=冷门但有机会`;

export async function POST(req: NextRequest) {
  const { modelId } = (await req.json().catch(() => ({}))) as { modelId?: string };

  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    prompt: "请搜索最新热点和趋势，提取灵感关键词。重点关注：AI 工具、开发者工具、健康科技、SaaS、电商创新等方向。",
    tools: researchTools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
