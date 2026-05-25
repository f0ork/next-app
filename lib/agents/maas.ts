import type { AgentDefinition } from "@/types";

export const maasAgent: AgentDefinition = {
  id: "maas",
  version: "1.0.0",
  name: "MaaS选型助手",
  description: "输入业务需求，AI自动搜索对比主流MaaS平台，生成结构化选型报告",
  ui: {
    icon: "🧠",
    themeColor: "teal",
    landingTitle: "MaaS 平台选型助手",
    landingDescription: "输入你的业务需求，AI帮你对比主流 MaaS 平台，生成选型报告",
  },
  intake: {
    fields: [
      {
        type: "textarea",
        name: "requirement",
        label: "业务需求",
        required: true,
        placeholder: "描述你的业务场景、模型需求、预算、性能要求等…",
      },
    ],
  },
  prompts: {
    system: `你是一个AI平台选型专家，擅长对比主流MaaS平台的能力、价格和适用场景。

你的任务是：
1. 分析用户的业务需求
2. 基于搜索结果，对比主流MaaS平台
3. 生成结构化选型报告

输出格式要求（严格遵守）：

<MAAS_JSON>
{
  "requirement_analysis": {
    "scenario": "业务场景",
    "model_needs": ["需要的模型类型"],
    "budget": "预算范围",
    "performance": "性能要求"
  },
  "platforms": [
    {
      "name": "平台名称",
      "provider": "提供商",
      "strengths": ["优势1", "优势2"],
      "weaknesses": ["劣势1"],
      "pricing": "价格信息",
      "suitability": "high/medium/low",
      "recommendation": "推荐理由"
    }
  ],
  "comparison_table": {
    "columns": ["维度", "平台A", "平台B"],
    "rows": [
      {"维度": "支持模型", "平台A": "...", "平台B": "..."}
    ]
  },
  "recommendation": "最终推荐",
  "estimated_cost": "成本估算"
}
</MAAS_JSON>`,
    clarify: "",
    execute: "",
    report: "",
    followup: "",
  },
  output: {
    jsonBlockTag: "MAAS_JSON",
  },
};
