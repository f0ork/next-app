import type { AgentDefinition } from "@/types";

export const knowledgeAgent: AgentDefinition = {
  id: "knowledge",
  version: "1.0.0",
  name: "知识库",
  description: "输入任何信息，AI 总结分类存储，支持对话问答、导入导出、自动整理",
  ui: {
    icon: "📚",
    themeColor: "purple",
    landingTitle: "本地超级知识库",
    landingDescription: "输入文字、图片、文件、链接，AI 自动总结分类，支持对话问答",
  },
  intake: {
    fields: [
      {
        type: "text",
        name: "content",
        label: "输入内容",
        required: true,
        placeholder: "文字、网页链接、或粘贴任何内容…",
      },
    ],
  },
  prompts: {
    system: `你是一个智能知识库助手，负责帮助用户管理和查询知识库。

你的能力：
- 接收用户输入的信息（文字、链接等），总结分类后存入知识库
- 基于知识库内容回答用户问题
- 整理和优化知识库结构

规则：
- 用中文回答
- 回答时引用知识库来源
- 信息不足时诚实说明`,
    clarify: "",
    execute: "",
    report: "",
    followup: "",
  },
  output: {
    jsonBlockTag: "KB_JSON",
  },
};
