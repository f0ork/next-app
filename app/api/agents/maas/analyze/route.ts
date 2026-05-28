import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { auth } from "@/lib/auth";
import { recordUsage } from "@/lib/gateway";
import { webSearch, fetchPageContent } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个AI平台选型专家，专门帮用户对比主流MaaS平台，生成结构化选型报告。

你需要搜索以下主流MaaS平台的信息：
- 华为云 ModelArts
- 讯飞星辰 MaaS
- 百度智能云千帆
- 阿里云 PAI
- 腾讯云 TI
- 字节火山引擎 豆包大模型
- 智谱 MaaS

输出格式（严格遵守 Markdown）：

## 需求分析
简要分析用户的业务场景和核心需求

## 平台对比表格
| 维度 | 华为云 ModelArts | 讯飞星辰 | 百度千帆 | 阿里云 PAI |
|------|-----------------|---------|---------|-----------|
| 支持模型 | ... | ... | ... | ... |
| 价格 | ... | ... | ... | ... |
| 易用性 | ... | ... | ... | ... |

## 各平台分析
### 华为云 ModelArts
- 优势：...
- 劣势：...
- 适用场景：...

### 讯飞星辰 MaaS
- 优势：...
- 劣势：...
- 适用场景：...

（继续其他平台）

## 推荐方案
基于用户需求，推荐最合适的平台和理由

## 成本估算
根据搜索到的价格信息，估算不同方案的年度成本

要求：
- 数据必须基于搜索结果，不要编造
- 价格信息尽量准确
- 用中文回答`;

async function gatherContext(requirement: string): Promise<string> {
  const queries = [
    "MaaS平台 华为云ModelArts 讯飞星辰 百度千帆 阿里云PAI 价格对比 2025",
    `${requirement.slice(0, 50)} MaaS平台 推荐`,
    "AI大模型平台 企业选型 功能对比 成本",
  ];

  const parts: string[] = [];
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
  const session = await auth();
  const userId = (session?.user as { id?: string })?.id;

  const { requirement, modelId } = (await req.json()) as {
    requirement: string;
    modelId?: string;
  };

  if (!requirement?.trim()) {
    return new Response(
      JSON.stringify({ error: "请描述你的业务需求" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const context = await gatherContext(requirement.trim());

  const start = Date.now();
  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    prompt: `用户业务需求：\n${requirement.trim()}\n\n以下是搜索到的 MaaS 平台信息：\n${context}`,
    maxOutputTokens: 8192,
    onFinish: async ({ usage }) => {
      await recordUsage({
        userId,
        agentId: "maas",
        providerId: "mify",
        modelId: modelId ?? "xiaomi/mimo-v2.5-pro",
        inputTokens: usage?.inputTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
        durationMs: Date.now() - start,
      }).catch(() => {});
    },
  });

  return result.toTextStreamResponse();
}
