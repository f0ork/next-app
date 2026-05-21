import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { webSearch, fetchPageContent } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个 Agent 产品设计师，专门帮用户在已有的 AI Agent 平台上设计可立即落地的新 Agent。

【平台能力约束】
这个平台是一个 Next.js Web 应用，当前已有 4 个 Agent：
- 资讯收集：AI 引导需求收集 → 结构化报告
- 股票分析：搜索股票 → 获取数据 → 模拟盘回测 → AI 问答
- 点子王：AI 搜索网络找灵感
- 知识库：录入内容 → AI 总结分类 → 向量检索问答

平台技术栈：
- 前端：Next.js + TypeScript + Tailwind CSS
- AI：直接调用大模型 API（mimo-v2.5-pro），支持流式输出
- 搜索：Playwright + Bing 本地浏览器搜索（无需 API key）
- 存储：文件系统 + SQLite（无数据库）
- 能力：网页搜索、网页内容抓取、AI 文本生成、结构化 JSON 输出

【设计原则】
1. 必须是**单个页面能完成**的小产品，不是大型 SaaS
2. 必须利用平台已有的能力（AI 调用、网页搜索、数据处理）
3. 用户交互必须简单：输入 → AI 处理 → 结构化输出
4. 每个 Agent 的核心价值在于 AI 的分析/总结/生成能力，而非技术复杂度
5. 避免需要实时数据、第三方 API、复杂基础设施的方案

【好的示例】
- AI 简历分析：粘贴简历 → AI 分析优劣势 → 给出优化建议
- AI 周报生成：输入工作内容碎片 → AI 整理成结构化周报
- AI 面试题生成：输入岗位 → AI 生成面试题 + 评分标准

【不好的示例】
- AI 法律文书助手（需要法律数据库）
- AI 电商推荐系统（需要商品数据库）
- AI 实时监控平台（需要持续数据源）

输出格式（严格遵守）：

<IDEA_JSON>
{
  "keyword": "用户关键词",
  "analysis": "基于搜索结果，这个方向有哪些用户痛点和机会",
  "ideas": [
    {
      "id": "idea_1",
      "name": "Agent 名称（4字以内）",
      "description": "一句话描述（15字以内）",
      "targetUser": "目标用户",
      "features": ["功能1", "功能2", "功能3"],
      "inputExample": "用户实际输入示例",
      "outputExample": "AI 实际输出示例（简化版）",
      "differentiator": "和其他工具的区别",
      "feasibility": "high",
      "techStack": ["平台已有能力1", "平台已有能力2"]
    }
  ]
}
</IDEA_JSON>

重要：feasibility 必须是 high，只提真正能做的东西。`;

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
