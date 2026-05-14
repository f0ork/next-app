import { NextRequest, NextResponse } from "next/server";
import { getStockHistory, searchStock } from "@/lib/stock/api";
import { runSimulation } from "@/lib/stock/simulator";
import type { SimRule } from "@/lib/stock/simulator";

export const runtime = "nodejs";

function getDateRange(period: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  switch (period) {
    case "1m": start.setMonth(end.getMonth() - 1); break;
    case "3m": start.setMonth(end.getMonth() - 3); break;
    case "6m": start.setMonth(end.getMonth() - 6); break;
    case "1y": start.setFullYear(end.getFullYear() - 1); break;
    default: start.setFullYear(end.getFullYear() - 1);
  }
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export async function POST(req: NextRequest) {
  const { stockCode, stockName, period, rule } = (await req.json()) as {
    stockCode?: string;
    stockName?: string;
    period?: string;
    rule?: SimRule;
  };

  if (!stockCode && !stockName) {
    return NextResponse.json({ error: "stockCode or stockName required" }, { status: 400 });
  }

  let fullCode = stockCode;
  let name = stockName ?? stockCode ?? "";

  if (!fullCode && stockName) {
    const results = await searchStock(stockName);
    if (results.length === 0) {
      return NextResponse.json({ error: `未找到: ${stockName}` }, { status: 404 });
    }
    fullCode = results[0].fullCode;
    name = results[0].name;
  }

  if (!fullCode) {
    return NextResponse.json({ error: "无法识别股票" }, { status: 404 });
  }

  const { start, end } = getDateRange(period ?? "1y");
  const data = await getStockHistory(fullCode, start, end);

  if (data.length === 0) {
    return NextResponse.json({ error: `${name} 无历史数据` }, { status: 404 });
  }

  const effectiveRule = {
    buyTriggerPercent: rule?.buyTriggerPercent ?? -2,
    buyAmountPercent: rule?.buyAmountPercent ?? 10,
    sellTriggerPercent: rule?.sellTriggerPercent ?? 2,
    sellAmountPercent: rule?.sellAmountPercent ?? 10,
    initialCapital: rule?.initialCapital ?? 10000,
  };

  const result = runSimulation(data, effectiveRule, name);
  return NextResponse.json({ result });
}
