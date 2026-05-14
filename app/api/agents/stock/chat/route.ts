import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import type { StockAnalysis } from "@/lib/stock/api";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { question, analysis } = (await req.json()) as {
    question: string;
    analysis: StockAnalysis;
  };

  if (!question?.trim() || !analysis) {
    return new Response(JSON.stringify({ error: "question and analysis required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const context = buildAnalysisContext(analysis);

  const systemPrompt = `你是一个专业的股票数据分析助手。基于以下股票数据回答用户问题。

${context}

规则：
- 只基于提供的数据分析，不编造数据
- 数字保留2位小数
- 使用中文回答
- 如果问题超出数据范围，诚实说明`;

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    prompt: question,
    maxOutputTokens: 4096,
  });

  return result.toTextStreamResponse();
}

function buildAnalysisContext(a: StockAnalysis): string {
  const lines: string[] = [];
  lines.push(`股票：${a.stock.name}（${a.stock.fullCode}）`);
  lines.push(`时间范围：${a.period.start} ~ ${a.period.end}`);
  lines.push(`交易天数：${a.summary.totalDays} 天`);
  lines.push(`平均涨跌幅：${a.summary.avgChange}%`);
  lines.push(`最大涨幅：${a.summary.maxGain.date} +${a.summary.maxGain.value}%`);
  lines.push(`最大跌幅：${a.summary.maxLoss.date} ${a.summary.maxLoss.value}%`);
  lines.push(`波动率：${a.summary.volatility}%`);
  lines.push(`趋势：${a.summary.trend === "up" ? "上涨" : a.summary.trend === "down" ? "下跌" : "横盘"}`);
  lines.push("");
  lines.push(`每日数据（共 ${a.dailyData.length} 天）：`);
  lines.push("日期,开盘,收盘,最高,最低,涨跌幅%");
  for (const d of a.dailyData) {
    lines.push(
      `${d.date},${d.open.toFixed(2)},${d.close.toFixed(2)},${d.high.toFixed(2)},${d.low.toFixed(2)},${d.changePercent > 0 ? "+" : ""}${d.changePercent.toFixed(2)}%`
    );
  }

  return lines.join("\n");
}
