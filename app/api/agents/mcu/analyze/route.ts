import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import { webSearch } from "@/lib/ai/search";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `你是一个资深嵌入式系统工程师，擅长快速提炼 MCU 数据手册中的关键技术信息。

你的任务是：
1. 分析用户提供的 MCU 数据手册内容
2. 提取关键设计要点

输出要求（严格遵守 Markdown 格式）：

## 核心参数
- 工作电压、主频、Flash/RAM 容量、封装形式
- 关键外设（UART/SPI/I2C/ADC 等数量和规格）

## 寄存器配置
- 关键寄存器的字段说明
- 默认值和推荐配置
- 注意事项

## 典型电路
- 电源电路设计要点
- 时钟电路配置
- 外设接口典型接法

## 编程要点
- 初始化流程
- 关键函数/API
- 常见坑和注意事项

## 注意事项
- 电气特性限制
- PCB 布局建议
- 常见设计陷阱

要求：
- 重点信息用 **加粗** 标记
- 数值保留原始精度
- 配置类信息给出明确建议值
- 使用中文`;

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdf = await import("pdf-parse");
    const parser = new pdf.PDFParse({ data: buffer });
    await (parser as unknown as { load(): Promise<void> }).load();
    const result = await parser.getText();
    return result.text.slice(0, 50000);
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let textContent = "";
  let source = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pasteText = formData.get("text") as string | null;

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer());
      textContent = await extractPdfText(buffer);
      source = file.name;
      if (!textContent) {
        return new Response(
          JSON.stringify({ error: "PDF 解析失败，请确保是文本型 PDF（非扫描件）" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } else if (pasteText?.trim()) {
      textContent = pasteText.trim();
      source = "粘贴文本";
    }
  } else {
    const body = (await req.json()) as { text?: string };
    textContent = body.text?.trim() ?? "";
    source = "粘贴文本";
  }

  if (!textContent) {
    return new Response(
      JSON.stringify({ error: "请上传 PDF 或粘贴文本内容" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  let searchContext = "";
  const chipMatch = textContent.match(/([A-Z]{2,}[-]?\d+[A-Z]?[-]?\d*)/);
  if (chipMatch) {
    const chipName = chipMatch[1];
    const searchResult = await webSearch(`${chipName} datasheet specifications`, 3);
    if (searchResult.results.length) {
      searchContext = "\n\n参考搜索结果：\n" + searchResult.results
        .map((r) => `- ${r.title}: ${r.snippet}`)
        .join("\n");
    }
  }

  const result = streamText({
    model: getModel(),
    system: SYSTEM_PROMPT,
    prompt: `以下是 MCU 数据手册内容（来源：${source}）：\n\n${textContent.slice(0, 30000)}${searchContext}`,
    maxOutputTokens: 16384,
  });

  return result.toTextStreamResponse();
}
