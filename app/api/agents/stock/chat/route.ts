import { NextRequest } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/client";
import type { StockAnalysis, DailyData } from "@/lib/stock/api";

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

  const strategyResult = simulateStrategy(analysis.dailyData, 1000);
  const context = buildAnalysisContext(analysis, strategyResult);

  const systemPrompt = `你是一个专业的股票数据分析助手。基于以下股票数据和策略回测结果回答用户问题。

${context}

规则：
- 基于提供的数据和回测结果进行分析，不编造数据
- 数字保留2位小数
- 使用中文回答
- 对于策略相关的提问，直接引用回测结果`;

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    prompt: question,
    maxOutputTokens: 2048,
  });

  return result.toTextStreamResponse();
}

interface StrategyResult {
  initialAmount: number;
  finalAmount: number;
  totalReturn: number;
  totalReturnPercent: number;
  totalBuys: number;
  totalSells: number;
  maxHoldings: number;
  maxCash: number;
}

function simulateStrategy(data: DailyData[], initialAmount: number): StrategyResult {
  let cash = initialAmount;
  let holdings = 0;
  let totalBuys = 0;
  let totalSells = 0;
  let maxHoldings = 0;
  let maxCash = initialAmount;

  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    const price = day.close;
    if (price <= 0) continue;

    if (i === 0 && holdings === 0 && cash > 0) {
      const buyQty = Math.floor(cash / price);
      if (buyQty > 0) {
        holdings += buyQty;
        cash -= buyQty * price;
        totalBuys++;
      }
    } else if (day.changePercent > 0 && holdings > 0) {
      const sellQty = Math.max(1, Math.floor(holdings * 0.1));
      if (sellQty > 0 && sellQty <= holdings) {
        holdings -= sellQty;
        cash += sellQty * price;
        totalSells++;
      }
    } else if (day.changePercent < 0 && cash > price) {
      const buyAmount = cash * 0.1;
      const buyQty = Math.floor(buyAmount / price);
      if (buyQty > 0) {
        holdings += buyQty;
        cash -= buyQty * price;
        totalBuys++;
      }
    }

    const totalValue = cash + holdings * price;
    maxHoldings = Math.max(maxHoldings, holdings * price);
    maxCash = Math.max(maxCash, cash);
  }

  const lastPrice = data[data.length - 1]?.close ?? 0;
  const finalAmount = cash + holdings * lastPrice;

  return {
    initialAmount,
    finalAmount: Math.round(finalAmount * 100) / 100,
    totalReturn: Math.round((finalAmount - initialAmount) * 100) / 100,
    totalReturnPercent: Math.round(((finalAmount - initialAmount) / initialAmount) * 10000) / 100,
    totalBuys,
    totalSells,
    maxHoldings: Math.round(maxHoldings * 100) / 100,
    maxCash: Math.round(maxCash * 100) / 100,
  };
}

function buildAnalysisContext(a: StockAnalysis, strategy: StrategyResult): string {
  const lines: string[] = [];
  lines.push(`股票：${a.stock.name}（${a.stock.fullCode}）`);
  lines.push(`时间范围：${a.period.start} ~ ${a.period.end}`);
  lines.push(`交易天数：${a.summary.totalDays} 天`);
  lines.push(`起始价：${a.dailyData[0]?.close ?? "N/A"}`);
  lines.push(`结束价：${a.dailyData[a.dailyData.length - 1]?.close ?? "N/A"}`);
  lines.push(`平均涨跌幅：${a.summary.avgChange}%`);
  lines.push(`最大涨幅：${a.summary.maxGain.date} +${a.summary.maxGain.value}%`);
  lines.push(`最大跌幅：${a.summary.maxLoss.date} ${a.summary.maxLoss.value}%`);
  lines.push(`波动率：${a.summary.volatility}%`);
  lines.push(`趋势：${a.summary.trend === "up" ? "上涨" : a.summary.trend === "down" ? "下跌" : "横盘"}`);
  lines.push("");
  lines.push("=== 策略回测结果（跌买涨卖 10%）===");
  lines.push(`初始资金：${strategy.initialAmount} 元`);
  lines.push(`最终资金：${strategy.finalAmount} 元`);
  lines.push(`总收益：${strategy.totalReturn} 元（${strategy.totalReturnPercent}%）`);
  lines.push(`买入次数：${strategy.totalBuys} 次`);
  lines.push(`卖出次数：${strategy.totalSells} 次`);
  lines.push(`最大持仓价值：${strategy.maxHoldings} 元`);
  lines.push(`最大现金：${strategy.maxCash} 元`);
  lines.push("");
  lines.push(`最近 30 天明细：`);
  lines.push("日期,开盘,收盘,最高,最低,涨跌幅%");
  for (const d of a.dailyData.slice(-30)) {
    lines.push(
      `${d.date},${d.open.toFixed(2)},${d.close.toFixed(2)},${d.high.toFixed(2)},${d.low.toFixed(2)},${d.changePercent > 0 ? "+" : ""}${d.changePercent.toFixed(2)}%`
    );
  }

  return lines.join("\n");
}
