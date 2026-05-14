import { NextRequest, NextResponse } from "next/server";
import { getStockHistory, analyzeStockData, searchStock } from "@/lib/stock/api";
import type { StockInfo } from "@/lib/stock/api";

export const runtime = "nodejs";

function getDateRange(period: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "1w":
      start.setDate(end.getDate() - 7);
      break;
    case "1m":
      start.setMonth(end.getMonth() - 1);
      break;
    case "3m":
      start.setMonth(end.getMonth() - 3);
      break;
    case "6m":
      start.setMonth(end.getMonth() - 6);
      break;
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export async function POST(req: NextRequest) {
  const { stockName, period, stockCode } = (await req.json()) as {
    stockName?: string;
    period?: string;
    stockCode?: string;
  };

  if (!stockName && !stockCode) {
    return NextResponse.json({ error: "stockName or stockCode required" }, { status: 400 });
  }

  let stock: StockInfo | undefined;

  if (stockCode) {
    const parts = stockCode.match(/^([a-zA-Z]+)(.+)$/);
    if (parts) {
      stock = {
        code: parts[2],
        name: stockName ?? stockCode,
        market: parts[1].toLowerCase() === "sh" ? "上海" :
                parts[1].toLowerCase() === "sz" ? "深圳" :
                parts[1].toLowerCase() === "us" ? "美股" : parts[1],
        fullCode: stockCode,
      };
    }
  }

  if (!stock && stockName) {
    const results = await searchStock(stockName);
    if (results.length === 0) {
      return NextResponse.json({ error: `未找到股票: ${stockName}` }, { status: 404 });
    }
    stock = results[0];
  }

  if (!stock) {
    return NextResponse.json({ error: "无法识别股票" }, { status: 404 });
  }

  const { start, end } = getDateRange(period ?? "1m");
  const dailyData = await getStockHistory(stock.fullCode, start, end);

  if (dailyData.length === 0) {
    return NextResponse.json(
      { error: `${stock.name} 在 ${start} ~ ${end} 期间无数据` },
      { status: 404 }
    );
  }

  const analysis = analyzeStockData(stock, dailyData, start, end);
  return NextResponse.json({ analysis });
}
