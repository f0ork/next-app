import type { DailyData } from "./api";

export interface SimRule {
  buyTrigger: number;
  sellTrigger: number;
  tradePercent: number;
  initialCapital: number;
}

export interface SimTrade {
  date: string;
  signalDate: string;
  action: "buy" | "sell";
  price: number;
  quantity: number;
  amount: number;
  holdingsAfter: number;
  cashAfter: number;
  triggerChange: number;
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
  buyTrigger: -2,
  sellTrigger: 2,
  tradePercent: 10,
  initialCapital: 10000,
};

export const RULE_PRESETS: Array<{ name: string; rule: SimRule }> = [
  {
    name: "稳健型",
    rule: { buyTrigger: -2, sellTrigger: 2, tradePercent: 10, initialCapital: 10000 },
  },
  {
    name: "激进型",
    rule: { buyTrigger: -0.1, sellTrigger: 0.1, tradePercent: 20, initialCapital: 10000 },
  },
  {
    name: "定投型",
    rule: { buyTrigger: -1, sellTrigger: 100, tradePercent: 5, initialCapital: 10000 },
  },
  {
    name: "止盈型",
    rule: { buyTrigger: -3, sellTrigger: 5, tradePercent: 100, initialCapital: 10000 },
  },
];

export function runSimulation(data: DailyData[], rule: SimRule, stockName: string): SimResult {
  let cash = rule.initialCapital;
  let holdings = 0;
  const trades: SimTrade[] = [];
  const snapshots: SimSnapshot[] = [];

  let maxDrawdown = 0;
  let peakValue = rule.initialCapital;
  let wins = 0;
  let totalTrades = 0;
  let lastSellPrice = 0;

  for (let i = 1; i < data.length; i++) {
    const signalDay = data[i - 1];
    const execDay = data[i];
    const execPrice = execDay.close;
    if (execPrice <= 0) continue;

    const signalChange = signalDay.changePercent;
    let action: "buy" | "sell" | null = null;

    if (signalChange <= rule.buyTrigger && cash > execPrice) {
      action = "buy";
    } else if (signalChange >= rule.sellTrigger && holdings > 0) {
      action = "sell";
    }

    if (action === "buy") {
      const buyAmount = cash * (rule.tradePercent / 100);
      const buyQty = Math.floor(buyAmount / execPrice);
      if (buyQty > 0) {
        holdings += buyQty;
        cash -= buyQty * execPrice;
        trades.push({
          date: execDay.date,
          signalDate: signalDay.date,
          action: "buy",
          price: execPrice,
          quantity: buyQty,
          amount: buyQty * execPrice,
          holdingsAfter: holdings,
          cashAfter: Math.round(cash * 100) / 100,
          triggerChange: signalChange,
        });
        totalTrades++;
      }
    } else if (action === "sell") {
      const sellQty =
        rule.tradePercent >= 100
          ? holdings
          : Math.max(1, Math.floor(holdings * (rule.tradePercent / 100)));
      if (sellQty > 0 && sellQty <= holdings) {
        const sellValue = sellQty * execPrice;
        if (lastSellPrice > 0 && execPrice > lastSellPrice) wins++;
        holdings -= sellQty;
        cash += sellValue;
        lastSellPrice = execPrice;
        trades.push({
          date: execDay.date,
          signalDate: signalDay.date,
          action: "sell",
          price: execPrice,
          quantity: sellQty,
          amount: sellValue,
          holdingsAfter: holdings,
          cashAfter: Math.round(cash * 100) / 100,
          triggerChange: signalChange,
        });
        totalTrades++;
      }
    }

    const totalValue = cash + holdings * execPrice;
    const changePercent =
      rule.initialCapital > 0
        ? ((totalValue - rule.initialCapital) / rule.initialCapital) * 100
        : 0;

    if (totalValue > peakValue) peakValue = totalValue;
    const drawdown = peakValue - totalValue;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (i % 5 === 0 || i === data.length - 1) {
      snapshots.push({
        date: execDay.date,
        price: execPrice,
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
