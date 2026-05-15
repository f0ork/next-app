import { NextRequest } from "next/server";
import { streamText, stepCountIs } from "ai";
import { getModel, researchTools } from "@/lib/ai/client";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个产品经理级别的 Agent 设计专家。用户已经从你提出的想法中选择了一个 Agent 点子，你的任务是将它细化为完整的产品需求文档。

你必须输出结构化的 JSON：

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
    "apis": ["需要的 API"],
    "tools": ["AI 工具"]
  },
  "inputFields": [
    {"name": "字段名", "type": "text/select/multi", "required": true, "options": []}
  ],
  "outputFormat": "输出格式描述",
  "feasibilityNotes": "技术可行性说明",
  "estimatedEffort": "high/medium/low"
}
</IDEA_JSON>

重要：用 web_search 工具搜索相关技术方案和竞品，确保方案可行。`;

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

  const context = [
    `关键词：${keyword ?? "未知"}`,
    `选中的 Agent：${idea.name}`,
    `描述：${idea.description}`,
    `功能：${idea.features.join("、")}`,
    feedback ? `用户补充：${feedback}` : "",
  ].filter(Boolean).join("\n");

  const result = streamText({
    model: getModel(modelId ?? "ppio/pa/claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    prompt: `基于以下选中的 Agent 点子，输出完整的产品需求文档：\n\n${context}\n\n请搜索相关技术方案和竞品，输出结构化的 JSON。`,
    tools: researchTools,
    stopWhen: stepCountIs(10),
    maxOutputTokens: 8192,
  });

  return result.toTextStreamResponse();
}
