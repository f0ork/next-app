import type { AgentDefinition, AgentTaskInput, TaskMessage } from "@/types";

export const researchAgent: AgentDefinition = {
  id: "research",
  version: "1.0.0",
  name: "资讯收集",
  description: "竞品分析、技术选型、通用调研——由 AI 引导需求收集，产出结构化报告",
  ui: {
    icon: "🔍",
    themeColor: "blue",
    landingTitle: "开始一项调研任务",
    landingDescription: "选择调研类型，AI 将引导你逐步明确需求，最终生成专业调研报告",
  },
  intake: {
    fields: [
      {
        type: "select",
        name: "mode",
        label: "调研类型",
        required: true,
        options: [
          { label: "竞品分析", value: "competitor_analysis" },
          { label: "技术选型", value: "tech_selection" },
          { label: "通用调研", value: "general_research" },
        ],
      },
      {
        type: "text",
        name: "topic",
        label: "调研主题",
        required: true,
        placeholder: "例如：国内 AI 编程助手工具",
      },
      {
        type: "textarea",
        name: "goal",
        label: "你希望回答什么问题",
        required: true,
        placeholder: "例如：想了解主流 AI 编程工具的核心差异、优劣势，为团队选型提供参考",
      },
      {
        type: "textarea",
        name: "constraints",
        label: "约束条件（可选）",
        required: false,
        placeholder: "例如：只考虑支持中文、有 IDE 插件的产品",
      },
    ],
  },
  prompts: {
    system: `你是一个专业的资讯收集 Agent，擅长系统性地收集、整理、分析信息。

你的工作流程：
1. **引导阶段**：评估用户提供的信息是否足够，若不足则一次提出 1-2 个最关键的补充问题
2. **执行阶段**：信息充足后，进行深入分析和调研
3. **报告阶段**：产出结构化报告，包含可读摘要和严格格式的 JSON 数据块

核心规则：
- 每次最多提问 2 个问题，避免让用户感到繁琐
- 提问要具体、可操作，而非泛泛而谈
- 报告必须包含具体的洞察，避免空话
- 最终报告必须包含 <REPORT_JSON> 数据块，格式严格`,

    clarify: `请评估当前收集到的信息是否足够开展调研。

判断标准：
- 调研主题明确
- 核心问题清晰
- 范围边界基本确定

如果信息不足：
- 一次只提出最关键的 1-2 个补充问题
- 问题要具体，帮助用户理解为什么需要这些信息
- 格式：直接提问，不要解释太多背景

如果信息已足够：
- 回复：READY_TO_EXECUTE
- 然后直接开始执行分析`,

    execute: `基于以下调研需求，请进行深度调研和分析：

{context}

调研要求：
- 覆盖主题的核心维度
- 提供具体的数据点和事实依据
- 识别关键趋势和规律
- 指出主要风险和机会
- 对比分析（如适用）

请直接开始分析，不需要重复描述任务背景。`,

    report: `请基于上述分析，生成完整的调研报告。

输出格式（严格遵守，两部分都要有）：

第一部分：可直接阅读的中文报告正文

第二部分：在正文末尾输出以下精确格式的 JSON 数据块（字段名必须完全一致）：

<REPORT_JSON>
{
  "summary": {
    "title": "报告标题（字符串）",
    "abstract": "2-3句话核心摘要（字符串）",
    "keyFindings": ["核心发现1", "核心发现2", "核心发现3"]
  },
  "sections": [
    {
      "id": "sec_1",
      "title": "章节标题",
      "markdown": "章节正文内容，支持 **加粗**、列表等 markdown",
      "order": 1
    }
  ],
  "cards": [
    {
      "type": "insight",
      "id": "card_1",
      "title": "核心洞察标题",
      "points": ["洞察要点1", "洞察要点2", "洞察要点3"]
    },
    {
      "type": "comparison",
      "id": "card_2",
      "title": "对比分析",
      "columns": ["维度", "方案A", "方案B"],
      "rows": [
        {"维度": "价格", "方案A": "免费", "方案B": "付费"}
      ]
    }
  ],
  "followupSuggestions": ["建议进一步了解的方向1", "建议调研的话题2"]
}
</REPORT_JSON>

严格要求：
- 第二部分必须以 <REPORT_JSON> 开头，</REPORT_JSON> 结尾
- JSON 字段名必须完全按照上面的模板（summary/sections/cards/followupSuggestions）
- cards 的 type 只能是 insight/comparison/risk/timeline 之一
- 必须是合法 JSON，不含注释、不含尾逗号
- sections 至少 2 个，cards 至少 1 个，keyFindings 3-5 条`,

    followup: `用户正在基于已有报告进行追问。请结合报告内容和新问题给出准确、有深度的回答。

如果追问涉及报告未覆盖的重要方向，可以建议更新报告。`,
  },
  output: {
    jsonBlockTag: "REPORT_JSON",
  },
};

export function buildExecutePrompt(
  agent: AgentDefinition,
  input: AgentTaskInput,
  history: TaskMessage[]
): string {
  const modeLabel =
    input.mode === "competitor_analysis"
      ? "竞品分析"
      : input.mode === "tech_selection"
      ? "技术选型"
      : "通用调研";

  const context = [
    `调研类型：${modeLabel}`,
    `调研主题：${input.topic}`,
    `核心问题：${input.goal}`,
    input.constraints ? `约束条件：${input.constraints}` : "",
    input.extraContext ? `补充信息：${input.extraContext}` : "",
    history.length > 0
      ? `\n补充澄清（来自多轮对话）：\n${history
          .filter((m) => m.role === "user" && m.kind === "chat")
          .slice(-6)
          .map((m) => `- ${m.content}`)
          .join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return agent.prompts.execute.replace("{context}", context);
}
