export interface StockInfo {
  code: string;
  name: string;
  market: string;
  fullCode: string;
}

export interface DailyData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  changePercent: number;
}

export interface StockAnalysis {
  stock: StockInfo;
  period: { start: string; end: string };
  dailyData: DailyData[];
  summary: {
    totalDays: number;
    avgChange: number;
    maxGain: { date: string; value: number };
    maxLoss: { date: string; value: number };
    volatility: number;
    trend: "up" | "down" | "flat";
  };
}

const INDEX_TO_ETF: Record<string, { code: string; name: string }> = {
  ndx: { code: "QQQ", name: "Invesco QQQ (纳斯达克100 ETF)" },
  spx: { code: "SPY", name: "SPDR S&P 500 ETF" },
  dji: { code: "DIA", name: "SPDR Dow Jones ETF" },
  ixic: { code: "QQQ", name: "Invesco QQQ (纳斯达克100 ETF)" },
};

export async function searchStock(keyword: string): Promise<StockInfo[]> {
  try {
    const url = `https://smartbox.gtimg.cn/s3/?v=2&q=${encodeURIComponent(keyword)}&t=all&c=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();

    const match = text.match(/v_hint="([^"]*)"/);
    if (!match) return [];

    const entries = match[1].split(";");
    const results: StockInfo[] = [];

    for (const entry of entries) {
      const parts = entry.split("~");
      if (parts.length >= 4) {
        const market = parts[0];
        const code = parts[1];
        const name = parts[2];

        if (market && code && name) {
          let fullCode: string;
          let displayName = decodeUnicode(name);
          let displayCode = code;

          if (market === "us") {
            const upperCode = code.toUpperCase().split(".")[0];
            const etf = INDEX_TO_ETF[upperCode.toLowerCase()];
            if (etf) {
              displayCode = etf.code;
              displayName = etf.name;
              fullCode = `us${etf.code}.OQ`;
            } else if (code.includes(".")) {
              fullCode = `us${code.toUpperCase()}`;
            } else {
              fullCode = `us${code.toUpperCase()}.OQ`;
            }
          } else {
            fullCode = `${market}${code}`;
          }

          results.push({
            code: displayCode,
            name: displayName,
            market: market === "sh" ? "上海" : market === "sz" ? "深圳" : market === "hk" ? "港股" : market === "us" ? "美股" : market,
            fullCode,
          });
        }
      }
    }

    return results.slice(0, 10);
  } catch {
    return [];
  }
}

export async function getStockHistory(
  fullCode: string,
  startDate: string,
  endDate: string
): Promise<DailyData[]> {
  try {
    const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${fullCode},day,${startDate},${endDate},500,qfq`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = (await res.json()) as {
      data?: Record<string, { day?: string[][]; qfqday?: string[][] }>;
    };

    const stockData = data.data?.[fullCode];
    const klines = stockData?.day ?? stockData?.qfqday ?? [];

    return klines.map((k) => {
      const open = parseFloat(k[1]);
      const close = parseFloat(k[2]);
      const high = parseFloat(k[3]);
      const low = parseFloat(k[4]);
      const volume = parseFloat(k[5]);
      const changePercent = open > 0 ? ((close - open) / open) * 100 : 0;

      return {
        date: k[0],
        open,
        close,
        high,
        low,
        volume,
        changePercent: Math.round(changePercent * 100) / 100,
      };
    });
  } catch {
    return [];
  }
}

export function analyzeStockData(
  stock: StockInfo,
  dailyData: DailyData[],
  startDate: string,
  endDate: string
): StockAnalysis {
  if (dailyData.length === 0) {
    return {
      stock,
      period: { start: startDate, end: endDate },
      dailyData: [],
      summary: {
        totalDays: 0,
        avgChange: 0,
        maxGain: { date: "", value: 0 },
        maxLoss: { date: "", value: 0 },
        volatility: 0,
        trend: "flat",
      },
    };
  }

  const changes = dailyData.map((d) => d.changePercent);
  const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;

  let maxGain = { date: dailyData[0].date, value: changes[0] };
  let maxLoss = { date: dailyData[0].date, value: changes[0] };

  for (let i = 1; i < changes.length; i++) {
    if (changes[i] > maxGain.value) maxGain = { date: dailyData[i].date, value: changes[i] };
    if (changes[i] < maxLoss.value) maxLoss = { date: dailyData[i].date, value: changes[i] };
  }

  const variance = changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) / changes.length;
  const volatility = Math.sqrt(variance);

  const firstClose = dailyData[0].close;
  const lastClose = dailyData[dailyData.length - 1].close;
  const overallChange = ((lastClose - firstClose) / firstClose) * 100;
  const trend = overallChange > 1 ? "up" : overallChange < -1 ? "down" : "flat";

  return {
    stock,
    period: { start: startDate, end: endDate },
    dailyData,
    summary: {
      totalDays: dailyData.length,
      avgChange: Math.round(avgChange * 100) / 100,
      maxGain,
      maxLoss,
      volatility: Math.round(volatility * 100) / 100,
      trend,
    },
  };
}

function decodeUnicode(str: string): string {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}
