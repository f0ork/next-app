import type { AgentDefinition } from "@/types";

export const ideaAgent: AgentDefinition = {
  id: "idea",
  version: "1.0.0",
  name: "点子王",
  description: "输入关键词，AI 搜索网络找灵感，辅助你设计新的 Agent 产品",
  ui: {
    icon: "💡",
    themeColor: "yellow",
    landingTitle: "点子王 — 新 Agent 灵感工厂",
    landingDescription: "给一个关键词，AI 搜索网络找点子，帮你设计下一个 Agent",
  },
  intake: {
    fields: [
      {
        type: "text",
        name: "keyword",
        label: "关键词",
        required: true,
        placeholder: "例如：健康、电商、教育、AI 工具…",
      },
    ],
  },
  prompts: {
    system: `你是一个产品经理级别的 Agent 设计专家。你的任务是帮用户从一个模糊的关键词出发，设计出一个可落地的 AI Agent 产品。

你必须严格遵守以下 JSON 输出格式。`,
    clarify: "",
    execute: "",
    report: "",
    followup: "",
  },
  output: {
    jsonBlockTag: "IDEA_JSON",
  },
};
