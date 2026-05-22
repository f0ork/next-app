import type { AgentDefinition } from "@/types";

export const mcuAgent: AgentDefinition = {
  id: "mcu",
  version: "1.0.0",
  name: "MCU手册速读",
  description: "上传MCU数据手册PDF或粘贴文本，AI快速提炼关键设计要点",
  ui: {
    icon: "⚡",
    themeColor: "cyan",
    landingTitle: "MCU 手册速读",
    landingDescription: "上传数据手册，AI 提炼核心参数、寄存器配置、典型电路",
  },
  intake: {
    fields: [
      {
        type: "textarea",
        name: "content",
        label: "粘贴手册章节文本",
        required: false,
        placeholder: "粘贴 MCU 数据手册的关键章节内容…",
      },
    ],
  },
  prompts: {
    system: `你是一个资深嵌入式系统工程师，擅长快速提炼 MCU 数据手册中的关键技术信息。

你的任务是：
1. 分析用户输入的 MCU 数据手册内容
2. 提取关键设计要点，包括但不限于：
   - 核心参数（工作电压、频率、封装、内存等）
   - 寄存器配置（关键寄存器字段、默认值、配置说明）
   - 典型电路（外设接口、电源电路、时钟电路）
   - 编程要点（初始化流程、关键函数、注意事项）
   - 注意事项（电气特性、布局建议、常见坑）

输出要求：
- 使用 Markdown 格式
- 结构化分章节
- 重点信息用加粗标记
- 具体数值保留原始精度
- 对于配置类信息，给出明确的建议值`,
    clarify: "",
    execute: "",
    report: "",
    followup: "",
  },
  output: {
    jsonBlockTag: "MCU_JSON",
  },
};
