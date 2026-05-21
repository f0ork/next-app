import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { webSearch } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个 Agent 产品设计师。用户已选择了一个 Agent 点子，你的任务是将它细化为可落地的产品需求。

【平台约束】
这是一个 Next.js Web 应用，技术栈：
- 前端：Next.js + TypeScript + Tailwind CSS
- AI：大模型 API（mimo-v2.5-pro），支持流式输出
- 搜索：Playwright + Bing 本地浏览器搜索
- 存储：文件系统 + SQLite
- 能力：网页搜索、网页内容抓取、AI 文本生成、结构化 JSON 输出

你必须输出结构化 JSON：

<IDEA_JSON>
{
  "name": "Agent 名称",
  "description": "一句话描述",
  "targetUser": "目标用户画像",
  "userJourney": [
    {"step": 1, "action": "用户操作", "system": "系统响应"}
  ],
  "features": [
    {"name": "功能名", "description": "描述", "priority": "P0/P1/P2"}
  ],
  "techStack": {
    "dataSources": ["数据来源"],
    "tools": ["使用的平台能力"]
  },
  "inputFields": [
    {"name": "字段名", "type": "text/select/multi", "required": true, "options": []}
  ],
  "outputFormat": "输出格式描述",
  "feasibilityNotes": "技术可行性说明",
  "estimatedEffort": "low"
}
</IDEA_JSON>

estimatedEffort 必须是 low，只设计真正能立即做的东西。`;

async function gatherRefineContext(keyword: string, ideaName: string): Promise<string> {
  const queries = [
    `${ideaName} 产品 竞品 分析`,
    `${keyword} 技术方案 API 数据源`,
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
  const { keyword, idea, feedback, modelId } = (await req.json()) as {
    keyword?: string;
    idea?: { name: string; description: string; features: string[] };
    feedback?: string;
    modelId?: string;
  };

  if (!idea?.name) {
    return new Response(
      JSON.stringify({ error: "idea (name, description, features) required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const searchContext = await gatherRefineContext(keyword ?? "", idea.name);

  const userContext = [
    `关键词：${keyword ?? "未知"}`,
    `选中的 Agent：${idea.name}`,
    `描述：${idea.description}`,
    `功能：${idea.features.join("、")}`,
    feedback ? `用户补充：${feedback}` : "",
  ].filter(Boolean).join("\n");

  const result = streamText({
    model: getModel(modelId),
    system: SYSTEM_PROMPT,
    prompt: `基于以下选中的 Agent 点子，输出完整的产品需求文档：\n\n${userContext}\n\n以下是搜索到的相关资料：\n${searchContext}`,
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
