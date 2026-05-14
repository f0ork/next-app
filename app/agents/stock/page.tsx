"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { StockInfo, StockAnalysis } from "@/lib/stock/api";
import type { SimRule, SimResult, SimTrade } from "@/lib/stock/simulator";
import { DEFAULT_RULE, RULE_PRESETS } from "@/lib/stock/simulator";

type Stage = "input" | "searching" | "selecting" | "loading" | "result";
type Tab = "data" | "simulate" | "chat";

export default function StockAgentPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [stockName, setStockName] = useState("");
  const [period, setPeriod] = useState("1m");
  const [searchResults, setSearchResults] = useState<StockInfo[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);
  const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("data");
  const [simRule, setSimRule] = useState<SimRule>(DEFAULT_RULE);
  const [simResult, setSimResult] = useState<SimResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleSearch = async () => {
    if (!stockName.trim()) return;
    setStage("searching");
    setError("");

    try {
      const res = await fetch(`/api/agents/stock/search?q=${encodeURIComponent(stockName.trim())}`);
      const data = (await res.json()) as { results?: StockInfo[]; error?: string };

      if (!res.ok || !data.results?.length) {
        throw new Error(data.error ?? "未找到相关股票");
      }

      setSearchResults(data.results);
      setStage("selecting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "搜索失败");
      setStage("input");
    }
  };

  const handleSelectStock = async (stock: StockInfo) => {
    setSelectedStock(stock);
    setStage("loading");
    setError("");

    try {
      const res = await fetch("/api/agents/stock/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockName: stock.name, period, stockCode: stock.fullCode }),
      });
      const data = (await res.json()) as { analysis?: StockAnalysis; error?: string };

      if (!res.ok || !data.analysis) {
        throw new Error(data.error ?? "获取数据失败");
      }

      setAnalysis(data.analysis);
      setChatMessages([
        {
          role: "assistant",
          content: `已获取 **${data.analysis.stock.name}**（${data.analysis.stock.fullCode}）在 ${data.analysis.period.start} ~ ${data.analysis.period.end} 期间的 ${data.analysis.summary.totalDays} 个交易日数据。\n\n**概览：**\n- 平均涨跌幅：${data.analysis.summary.avgChange}%\n- 最大涨幅：${data.analysis.summary.maxGain.date} +${data.analysis.summary.maxGain.value}%\n- 最大跌幅：${data.analysis.summary.maxLoss.date} ${data.analysis.summary.maxLoss.value}%\n- 趋势：${data.analysis.summary.trend === "up" ? "上涨 📈" : data.analysis.summary.trend === "down" ? "下跌 📉" : "横盘 ➡️"}\n\n你可以问我关于这只股票的任何问题。`,
        },
      ]);
      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "获取数据失败");
      setStage("selecting");
    }
  };

  const handleSimulate = async () => {
    if (!analysis) return;
    setSimLoading(true);
    try {
      const res = await fetch("/api/agents/stock/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: analysis.stock.fullCode,
          stockName: analysis.stock.name,
          period: "1y",
          rule: simRule,
        }),
      });
      const data = (await res.json()) as { result?: SimResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "模拟失败");
      setSimResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "模拟失败");
    } finally {
      setSimLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading || !analysis) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatLoading(true);

    const assistantIdx = chatMessages.length + 1;
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/agents/stock/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, analysis }),
      });

      if (!res.ok || !res.body) {
        throw new Error("请求失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setChatMessages((prev) =>
          prev.map((m, i) => (i === assistantIdx ? { ...m, content: fullText } : m))
        );
      }
    } catch (err) {
      setChatMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIdx
            ? { ...m, content: `❌ ${err instanceof Error ? err.message : "请求失败"}` }
            : m
        )
      );
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      <header className="border-b border-gray-800 bg-[#080810] px-6 py-3 flex items-center gap-3">
        <Link href="/agents" className="text-gray-500 hover:text-gray-300 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <span className="text-sm font-medium text-gray-200">股票分析</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-6">

          {stage === "input" && (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">股票数据分析</h1>
                <p className="text-gray-400 text-sm">输入股票名称，获取涨跌幅数据，支持数据问答</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    股票名称或代码
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={stockName}
                    onChange={(e) => setStockName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
                    placeholder="例如：贵州茅台、AAPL、600519"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">时间范围</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: "1w", label: "1 周" },
                      { value: "1m", label: "1 月" },
                      { value: "3m", label: "3 月" },
                      { value: "6m", label: "6 月" },
                      { value: "1y", label: "1 年" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setPeriod(opt.value)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          period === opt.value
                            ? "bg-green-600 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => void handleSearch()}
                  disabled={!stockName.trim()}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  搜索股票
                </button>
              </div>
            </>
          )}

          {stage === "searching" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">搜索中…</p>
            </div>
          )}

          {stage === "selecting" && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-white">选择股票</h2>
                <p className="text-gray-400 text-sm">找到 {searchResults.length} 个结果</p>
              </div>

              <div className="space-y-2">
                {searchResults.map((stock) => (
                  <button
                    key={stock.fullCode}
                    onClick={() => void handleSelectStock(stock)}
                    className="w-full text-left px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl hover:border-green-500 hover:bg-gray-800 transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="text-sm font-medium text-white">{stock.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{stock.code}</span>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                      {stock.market}
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => { setStage("input"); setSearchResults([]); }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                重新搜索
              </button>
            </>
          )}

          {stage === "loading" && (
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">正在获取 {selectedStock?.name} 的历史数据…</p>
            </div>
          )}

          {stage === "result" && analysis && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-green-950/60 to-emerald-950/60 border border-green-800/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">{analysis.stock.name}</h2>
                    <span className="text-sm text-gray-400">{analysis.stock.fullCode} · {analysis.stock.market}</span>
                  </div>
                  <div className={`text-2xl font-bold ${
                    analysis.summary.trend === "up" ? "text-green-400" :
                    analysis.summary.trend === "down" ? "text-red-400" : "text-gray-400"
                  }`}>
                    {analysis.summary.trend === "up" ? "📈" : analysis.summary.trend === "down" ? "📉" : "➡️"}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">交易天数</span>
                    <p className="text-lg font-semibold text-white">{analysis.summary.totalDays}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">平均涨跌</span>
                    <p className={`text-lg font-semibold ${analysis.summary.avgChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {analysis.summary.avgChange > 0 ? "+" : ""}{analysis.summary.avgChange}%
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">最大涨幅</span>
                    <p className="text-lg font-semibold text-green-400">+{analysis.summary.maxGain.value}%</p>
                    <span className="text-xs text-gray-500">{analysis.summary.maxGain.date}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">最大跌幅</span>
                    <p className="text-lg font-semibold text-red-400">{analysis.summary.maxLoss.value}%</p>
                    <span className="text-xs text-gray-500">{analysis.summary.maxLoss.date}</span>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-gray-800">
                {([
                  { key: "data" as Tab, label: "数据表格" },
                  { key: "simulate" as Tab, label: "模拟盘" },
                  { key: "chat" as Tab, label: "数据问答" },
                ]).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.key
                        ? "border-green-500 text-green-400"
                        : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "data" && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-300">每日涨跌幅</span>
                    <span className="text-xs text-gray-500">{analysis.period.start} ~ {analysis.period.end}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-900">
                        <tr className="text-gray-500">
                          <th className="px-3 py-2 text-left">日期</th>
                          <th className="px-3 py-2 text-right">开盘</th>
                          <th className="px-3 py-2 text-right">收盘</th>
                          <th className="px-3 py-2 text-right">最高</th>
                          <th className="px-3 py-2 text-right">最低</th>
                          <th className="px-3 py-2 text-right">涨跌幅</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.dailyData.map((d) => (
                          <tr key={d.date} className="border-t border-gray-800/50 hover:bg-gray-800/30">
                            <td className="px-3 py-2 text-gray-300">{d.date}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{d.open.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-300 font-medium">{d.close.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{d.high.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right text-gray-400">{d.low.toFixed(2)}</td>
                            <td className={`px-3 py-2 text-right font-medium ${
                              d.changePercent > 0 ? "text-green-400" :
                              d.changePercent < 0 ? "text-red-400" : "text-gray-400"
                            }`}>
                              {d.changePercent > 0 ? "+" : ""}{d.changePercent.toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === "simulate" && (
                <div className="space-y-4">
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-300">策略配置</h3>
                      <div className="flex gap-1.5">
                        {RULE_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => setSimRule(preset.rule)}
                            className="text-xs px-2 py-1 rounded-md bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                          >
                            {preset.name.split("（")[0]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">初始资金</label>
                        <input
                          type="number"
                          value={simRule.initialCapital}
                          onChange={(e) => setSimRule({ ...simRule, initialCapital: Number(e.target.value) })}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">买入条件</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">跌</span>
                          <input
                            type="number"
                            step="0.1"
                            value={simRule.buyTrigger}
                            onChange={(e) => setSimRule({ ...simRule, buyTrigger: Number(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-7 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-green-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">卖出条件</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">涨</span>
                          <input
                            type="number"
                            step="0.1"
                            value={simRule.sellTrigger}
                            onChange={(e) => setSimRule({ ...simRule, sellTrigger: Number(e.target.value) })}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-7 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-green-500"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 mb-1 block">交易比例 %</label>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          max="100"
                          value={simRule.tradePercent}
                          onChange={(e) => setSimRule({ ...simRule, tradePercent: Number(e.target.value) })}
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>

                    <p className="text-xs text-gray-600">T+1 规则：今天的涨跌幅决定明天的买入/卖出</p>

                    <button
                      onClick={() => void handleSimulate()}
                      disabled={simLoading}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium text-sm hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 transition-all"
                    >
                      {simLoading ? "回测中…" : "开始模拟"}
                    </button>
                  </div>

                  {simResult && (
                    <div className="space-y-4">
                      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                        <h3 className="text-sm font-medium text-gray-300 mb-3">回测结果</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-gray-500">最终金额</span>
                            <p className={`text-lg font-bold ${simResult.summary.totalReturn >= 0 ? "text-green-400" : "text-red-400"}`}>
                              ¥{simResult.summary.finalValue.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">总收益率</span>
                            <p className={`text-lg font-bold ${simResult.summary.totalReturnPercent >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {simResult.summary.totalReturnPercent > 0 ? "+" : ""}{simResult.summary.totalReturnPercent}%
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">买入/卖出</span>
                            <p className="text-lg font-bold text-white">
                              {simResult.summary.totalBuys} / {simResult.summary.totalSells}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">最大回撤</span>
                            <p className="text-lg font-bold text-red-400">
                              -{simResult.summary.maxDrawdownPercent}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {simResult.trades.length > 0 && (
                        <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                          <div className="px-4 py-3 border-b border-gray-800">
                            <span className="text-sm font-medium text-gray-300">交易记录</span>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="sticky top-0 bg-gray-900">
                                <tr className="text-gray-500">
                                  <th className="px-3 py-2 text-left">日期</th>
                                  <th className="px-3 py-2 text-left">操作</th>
                                  <th className="px-3 py-2 text-right">触发涨跌</th>
                                  <th className="px-3 py-2 text-right">价格</th>
                                  <th className="px-3 py-2 text-right">数量</th>
                                  <th className="px-3 py-2 text-right">金额</th>
                                </tr>
                              </thead>
                              <tbody>
                                {simResult.trades.map((t: SimTrade, i: number) => (
                                  <tr key={i} className="border-t border-gray-800/50">
                                    <td className="px-3 py-2 text-gray-300">{t.date}</td>
                                    <td className="px-3 py-2">
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                                        t.action === "buy"
                                          ? "bg-green-900/50 text-green-400"
                                          : "bg-red-900/50 text-red-400"
                                      }`}>
                                        {t.action === "buy" ? "买入" : "卖出"}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <span className={`text-xs ${
                                        t.triggerChange > 0 ? "text-green-400" :
                                        t.triggerChange < 0 ? "text-red-400" : "text-gray-400"
                                      }`}>
                                        {t.triggerChange > 0 ? "+" : ""}{t.triggerChange.toFixed(1)}%
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-right text-gray-300">{t.price.toFixed(2)}</td>
                                    <td className="px-3 py-2 text-right text-gray-400">{t.quantity}</td>
                                    <td className="px-3 py-2 text-right text-gray-300">¥{t.amount.toFixed(2)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "chat" && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="h-64 overflow-y-auto px-4 py-3 space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                          msg.role === "user"
                            ? "bg-green-600 text-white rounded-tr-sm"
                            : "bg-gray-800 text-gray-200 rounded-tl-sm"
                        }`}>
                          <span className="whitespace-pre-wrap">{msg.content}</span>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-800 px-3 py-2 rounded-xl rounded-tl-sm flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                  <div className="px-4 py-3 border-t border-gray-800 flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleChat(); }}
                      placeholder="问一个关于这只股票的问题…"
                      disabled={chatLoading}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 transition-colors"
                    />
                    <button
                      onClick={() => void handleChat()}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                    >
                      发送
                    </button>
                  </div>
                </div>
              )}

              <div className="text-center">
                <button
                  onClick={() => {
                    setStage("input");
                    setAnalysis(null);
                    setChatMessages([]);
                    setSelectedStock(null);
                    setStockName("");
                    setSimResult(null);
                    setActiveTab("data");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  分析其他股票
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
