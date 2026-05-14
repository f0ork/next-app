import type { DailyData } from "./api";

export interface SimRule {
  buyTriggerPercent: number;
  buyAmountPercent: number;
  sellTriggerPercent: number;
  sellAmountPercent: number;
  initialCapital: number;
}

export interface SimTrade {
  date: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  amount: number;
  holdingsAfter: number;
  cashAfter: number;
}

export interface SimSnapshot {
  date: string;
  price: number;
  holdings: number;
  cash: number;
  totalValue: number;
  changePercent: number;
}

export interface SimResult {
  rule: SimRule;
  stockName: string;
  period: { start: string; end: string };
  summary: {
    initialCapital: number;
    finalValue: number;
    totalReturn: number;
    totalReturnPercent: number;
    totalBuys: number;
    totalSells: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    winRate: number;
  };
  trades: SimTrade[];
  snapshots: SimSnapshot[];
}

export const DEFAULT_RULE: SimRule = {
  buyTriggerPercent: -2,
  buyAmountPercent: 10,
  sellTriggerPercent: 2,
  sellAmountPercent: 10,
  initialCapital: 10000,
};

export const RULE_PRESETS: Array<{ name: string; rule: SimRule }> = [
  {
    name: "稳健型（涨跌2%触发）",
    rule: { buyTriggerPercent: -2, buyAmountPercent: 10, sellTriggerPercent: 2, sellAmountPercent: 10, initialCapital: 10000 },
  },
  {
    name: "激进型（涨跌5%触发）",
    rule: { buyTriggerPercent: -5, buyAmountPercent: 20, sellTriggerPercent: 5, sellAmountPercent: 20, initialCapital: 10000 },
  },
  {
    name: "定投型（每跌1%买5%）",
    rule: { buyTriggerPercent: -1, buyAmountPercent: 5, sellTriggerPercent: 100, sellAmountPercent: 0, initialCapital: 10000 },
  },
  {
    name: "止盈型（涨10%全卖）",
    rule: { buyTriggerPercent: -3, buyAmountPercent: 50, sellTriggerPercent: 10, sellAmountPercent: 100, initialCapital: 10000 },
  },
];

export function runSimulation(data: DailyData[], rule: SimRule, stockName: string): SimResult {
  let cash = rule.initialCapital;
  let holdings = 0;
  let lastBuyPrice = 0;
  const trades: SimTrade[] = [];
  const snapshots: SimSnapshot[] = [];

  let maxDrawdown = 0;
  let peakValue = rule.initialCapital;
  let wins = 0;
  let totalTrades = 0;

  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    const price = day.close;
    if (price <= 0) continue;

    if (i === 0 && holdings === 0 && cash > 0) {
      const buyAmount = cash * (rule.buyAmountPercent / 100);
      const buyQty = Math.floor(buyAmount / price);
      if (buyQty > 0) {
        holdings += buyQty;
        cash -= buyQty * price;
        lastBuyPrice = price;
        trades.push({
          date: day.date,
          action: "buy",
          price,
          quantity: buyQty,
          amount: buyQty * price,
          holdingsAfter: holdings,
          cashAfter: Math.round(cash * 100) / 100,
        });
        totalTrades++;
      }
    } else if (holdings > 0 && lastBuyPrice > 0) {
      const changeFromBuy = ((price - lastBuyPrice) / lastBuyPrice) * 100;

      if (changeFromBuy <= rule.buyTriggerPercent) {
        const buyAmount = cash * (rule.buyAmountPercent / 100);
        const buyQty = Math.floor(buyAmount / price);
        if (buyQty > 0) {
          holdings += buyQty;
          cash -= buyQty * price;
          lastBuyPrice = price;
          trades.push({
            date: day.date,
            action: "buy",
            price,
            quantity: buyQty,
            amount: buyQty * price,
            holdingsAfter: holdings,
            cashAfter: Math.round(cash * 100) / 100,
          });
          totalTrades++;
        }
      } else if (changeFromBuy >= rule.sellTriggerPercent) {
        const sellQty =
          rule.sellAmountPercent >= 100
            ? holdings
            : Math.max(1, Math.floor(holdings * (rule.sellAmountPercent / 100)));
        if (sellQty > 0 && sellQty <= holdings) {
          const sellValue = sellQty * price;
          const buyValue = sellQty * lastBuyPrice;
          if (sellValue > buyValue) wins++;
          holdings -= sellQty;
          cash += sellValue;
          trades.push({
            date: day.date,
            action: "sell",
            price,
            quantity: sellQty,
            amount: sellValue,
            holdingsAfter: holdings,
            cashAfter: Math.round(cash * 100) / 100,
          });
          totalTrades++;
          if (holdings === 0) lastBuyPrice = 0;
        }
      }
    }

    const totalValue = cash + holdings * price;
    const changePercent =
      rule.initialCapital > 0
        ? ((totalValue - rule.initialCapital) / rule.initialCapital) * 100
        : 0;

    if (totalValue > peakValue) peakValue = totalValue;
    const drawdown = peakValue - totalValue;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (i % 5 === 0 || i === data.length - 1) {
      snapshots.push({
        date: day.date,
        price,
        holdings,
        cash: Math.round(cash * 100) / 100,
        totalValue: Math.round(totalValue * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
      });
    }
  }

  const lastPrice = data[data.length - 1]?.close ?? 0;
  const finalValue = cash + holdings * lastPrice;
  const totalReturn = finalValue - rule.initialCapital;
  const totalReturnPercent =
    rule.initialCapital > 0 ? (totalReturn / rule.initialCapital) * 100 : 0;
  const maxDrawdownPercent =
    peakValue > 0 ? (maxDrawdown / peakValue) * 100 : 0;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  return {
    rule,
    stockName,
    period: {
      start: data[0]?.date ?? "",
      end: data[data.length - 1]?.date ?? "",
    },
    summary: {
      initialCapital: rule.initialCapital,
      finalValue: Math.round(finalValue * 100) / 100,
      totalReturn: Math.round(totalReturn * 100) / 100,
      totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
      totalBuys: trades.filter((t) => t.action === "buy").length,
      totalSells: trades.filter((t) => t.action === "sell").length,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
      winRate: Math.round(winRate * 100) / 100,
    },
    trades,
    snapshots,
  };
}
