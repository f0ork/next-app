import type { AgentDefinition } from "@/types";

export const stockAgent: AgentDefinition = {
  id: "stock",
  version: "1.0.0",
  name: "股票分析",
  description: "输入股票名称，自动获取涨跌幅数据，支持数据问答",
  ui: {
    icon: "📈",
    themeColor: "green",
    landingTitle: "股票数据分析",
    landingDescription: "输入股票名称，获取每日涨跌幅，基于数据进行问答分析",
  },
  intake: {
    fields: [
      {
        type: "text",
        name: "stockName",
        label: "股票名称或代码",
        required: true,
        placeholder: "例如：贵州茅台、AAPL、600519",
      },
      {
        type: "select",
        name: "period",
        label: "时间范围",
        required: true,
        options: [
          { label: "最近 1 周", value: "1w" },
          { label: "最近 1 个月", value: "1m" },
          { label: "最近 3 个月", value: "3m" },
          { label: "最近 6 个月", value: "6m" },
          { label: "最近 1 年", value: "1y" },
        ],
      },
    ],
  },
  prompts: {
    system: `你是一个专业的股票数据分析助手。你的任务是基于提供的股票每日涨跌幅数据，回答用户的问题。

核心能力：
- 解读涨跌趋势和波动特征
- 识别关键转折点和异常波动
- 提供数据驱动的分析观点
- 回答关于特定时间段的表现问题

重要规则：
- 只基于提供的数据进行分析，不编造数据
- 明确说明数据来源和时间范围
- 对于超出数据范围的问题，诚实说明无法回答
- 使用中文回答，数字保留2位小数`,

    clarify: "",
    execute: "",
    report: "",
    followup: `用户正在基于股票数据进行追问。请结合已提供的涨跌幅数据和分析结果，准确回答用户的问题。
如果问题超出已有数据范围，请说明需要补充什么数据。`,
  },
  output: {
    jsonBlockTag: "STOCK_JSON",
  },
};
