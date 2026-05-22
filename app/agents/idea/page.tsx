"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import ModelPicker, { useSelectedModel } from "@/app/components/ModelPicker";

interface IdeaProposal {
  id: string;
  name: string;
  description: string;
  targetUser: string;
  features: string[];
  differentiator: string;
  feasibility: string;
  techStack: string[];
}

interface BrainstormResult {
  keyword: string;
  analysis: string;
  ideas: IdeaProposal[];
}

interface RefinedIdea {
  name: string;
  description: string;
  targetUser: string;
  userJourney: Array<{ step: number; action: string; system: string }>;
  features: Array<{ name: string; description: string; priority: string }>;
  techStack: { dataSources: string[]; apis: string[]; tools: string[] };
  inputFields: Array<{ name: string; type: string; required: boolean; options?: string[] }>;
  outputFormat: string;
  feasibilityNotes: string;
  estimatedEffort: string;
}

function extractJson(text: string): unknown | null {
  const tagMatch = text.match(/<IDEA_JSON>([\s\S]*?)<\/IDEA_JSON>/);
  if (tagMatch) {
    try { return JSON.parse(tagMatch[1].trim()); } catch { /* ignored */ }
  }
  const codeMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (codeMatch) {
    try { return JSON.parse(codeMatch[1].trim()); } catch { /* ignored */ }
  }
  const braceMatch = text.match(/(\{[\s\S]*\})/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[1]); } catch { /* ignored */ }
  }
  return null;
}

interface TrendingKeyword {
  keyword: string;
  reason: string;
  heat: "hot" | "warm" | "cool";
  category: string;
}

type Stage = "input" | "loading-trending" | "trending" | "brainstorming" | "selecting" | "refining" | "result";

export default function IdeaAgentPage() {
  const { modelId } = useSelectedModel();
  const [stage, setStage] = useState<Stage>("input");
  const [keyword, setKeyword] = useState("");
  const [streamText, setStreamText] = useState("");
  const [brainstormResult, setBrainstormResult] = useState<BrainstormResult | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<IdeaProposal | null>(null);
  const [feedback, setFeedback] = useState("");
  const [refinedResult, setRefinedResult] = useState<RefinedIdea | null>(null);
  const [error, setError] = useState("");
  const [trendingKeywords, setTrendingKeywords] = useState<TrendingKeyword[]>([]);
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [streamText]);

  const handleFetchTrending = async () => {
    setStage("loading-trending");
    setStreamText("");
    setError("");

    try {
      const res = await fetch("/api/agents/idea/trending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId }),
      });

      if (!res.ok || !res.body) throw new Error("获取热点失败");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setStreamText(fullText);
      }

      const parsed = extractJson(fullText) as {
        trends?: Array<{ category: string; keywords: TrendingKeyword[] }>;
      } | null;
      if (parsed?.trends?.length) {
        const allKeywords: TrendingKeyword[] = [];
        for (const trend of parsed.trends) {
          for (const kw of trend.keywords) {
            allKeywords.push({ ...kw, category: trend.category });
          }
        }
        setTrendingKeywords(allKeywords);
        setStage("trending");
        return;
      }
      throw new Error("AI 未返回有效结果，请重试");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("input");
    }
  };

  const handleBrainstorm = async () => {
    if (!keyword.trim()) return;
    setStage("brainstorming");
    setStreamText("");
    setBrainstormResult(null);
    setError("");

    try {
      const res = await fetch("/api/agents/idea/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim(), modelId }),
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
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamText(fullText);
      }

      const parsed = extractJson(fullText) as BrainstormResult | null;
      if (parsed?.ideas?.length) {
        setBrainstormResult(parsed);
        setStage("selecting");
        return;
      }
      throw new Error("AI 未返回有效结果，请重试");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("input");
    }
  };

  const handleRefine = async () => {
    if (!selectedIdea) return;
    setStage("refining");
    setStreamText("");
    setRefinedResult(null);
    setError("");

    try {
      const res = await fetch("/api/agents/idea/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword,
          idea: selectedIdea,
          feedback: feedback.trim() || undefined,
          modelId,
        }),
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
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        setStreamText(fullText);
      }

      const parsed = extractJson(fullText) as RefinedIdea | null;
      if (parsed?.name) {
        setRefinedResult(parsed);
        setStage("result");
        return;
      }
      throw new Error("AI 未返回有效结果，请重试");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("selecting");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      <header className="border-b border-gray-800 bg-[#080810] px-6 py-3 flex items-center gap-3">
        <Link href="/agents" className="text-gray-500 hover:text-gray-300 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg">💡</span>
          <span className="text-sm font-medium text-gray-200">点子王</span>
        </div>
        <div className="ml-auto">
          <ModelPicker />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">

          {stage === "input" && (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">新 Agent 灵感工厂</h1>
                <p className="text-gray-400 text-sm">给一个关键词，AI 搜索网络找点子，帮你设计下一个 Agent</p>
              </div>

              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") void handleBrainstorm(); }}
                    placeholder="例如：健康、电商、教育、AI 工具…"
                    className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 text-base text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => void handleBrainstorm()}
                    disabled={!keyword.trim()}
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium text-sm hover:from-yellow-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    开始找点子
                  </button>
                  <button
                    onClick={() => void handleFetchTrending()}
                    className="px-5 py-3.5 rounded-2xl border border-gray-700 text-gray-300 hover:border-yellow-500 hover:text-yellow-400 text-sm transition-colors"
                  >
                    🔥 热点推荐
                  </button>
                </div>
              </div>
            </>
          )}

          {stage === "loading-trending" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-yellow-400 text-sm">
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  AI 正在搜索最新热点…
                </div>
              </div>
              <div
                ref={streamRef}
                className="bg-[#080812] border border-gray-800 rounded-xl h-48 overflow-y-auto px-4 py-3"
              >
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                  {streamText}
                  <span className="inline-block w-0.5 h-3 bg-yellow-400 animate-pulse ml-0.5 align-middle" />
                </pre>
              </div>
            </div>
          )}

          {stage === "trending" && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-white">🔥 热点灵感</h2>
                <p className="text-gray-500 text-sm">点击关键词直接开始调研</p>
              </div>

              <div className="space-y-4">
                {["hot", "warm", "cool"].map((heat) => {
                  const items = trendingKeywords.filter((k) => k.heat === heat);
                  if (!items.length) return null;
                  const label = heat === "hot" ? "🔥 热门" : heat === "warm" ? "⚡ 潜力" : "🌱 冷门机会";
                  return (
                    <div key={heat}>
                      <div className="text-xs text-gray-600 mb-2">{label}</div>
                      <div className="flex flex-wrap gap-2">
                        {items.map((kw) => (
                          <button
                            key={kw.keyword}
                            onClick={() => {
                              setKeyword(kw.keyword);
                              setTimeout(() => {
                                void (async () => {
                                  setStage("brainstorming");
                                  setStreamText("");
                                  setBrainstormResult(null);
                                  setError("");
                                  try {
                                    const res = await fetch("/api/agents/idea/brainstorm", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ keyword: kw.keyword, modelId }),
                                    });
                                    if (!res.ok || !res.body) throw new Error("请求失败");
                                    const reader = res.body.getReader();
                                    const decoder = new TextDecoder();
                                    let fullText = "";
                                    while (true) {
                                      const { done, value } = await reader.read();
                                      if (done) break;
                                      fullText += decoder.decode(value, { stream: true });
                                      setStreamText(fullText);
                                    }
                                    const parsed = extractJson(fullText) as BrainstormResult | null;
                                    if (parsed?.ideas?.length) {
                                      setBrainstormResult(parsed);
                                      setStage("selecting");
                                      return;
                                    }
                                    throw new Error("AI 未返回有效结果，请重试");
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : "未知错误");
                                    setStage("input");
                                  }
                                })();
                              }, 100);
                            }}
                            className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                              heat === "hot"
                                ? "border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                                : heat === "warm"
                                ? "border-orange-500/50 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20"
                                : "border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500"
                            }`}
                          >
                            {kw.keyword}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setTrendingKeywords([]); setStage("input"); }}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 text-sm transition-colors"
                >
                  返回
                </button>
                <button
                  onClick={() => void handleFetchTrending()}
                  className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:border-yellow-500 hover:text-yellow-400 text-sm transition-colors"
                >
                  换一批
                </button>
              </div>
            </>
          )}

          {(stage === "brainstorming" || stage === "refining") && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-yellow-400 text-sm">
                  <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                  {stage === "brainstorming" ? "AI 正在搜索网络找灵感…" : "AI 正在细化方案…"}
                </div>
              </div>

              <div
                ref={streamRef}
                className="bg-[#080812] border border-gray-800 rounded-xl h-64 overflow-y-auto px-4 py-3"
              >
                <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
                  {streamText}
                  <span className="inline-block w-0.5 h-3 bg-yellow-400 animate-pulse ml-0.5 align-middle" />
                </pre>
              </div>
            </div>
          )}

          {stage === "selecting" && brainstormResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white mb-1">AI 找到了 {brainstormResult.ideas.length} 个点子</h2>
                <p className="text-gray-500 text-sm">选一个你感兴趣的，AI 会帮你细化成完整需求</p>
              </div>

              <div className="space-y-3">
                {brainstormResult.ideas.map((idea) => (
                  <button
                    key={idea.id}
                    onClick={() => setSelectedIdea(idea)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all ${
                      selectedIdea?.id === idea.id
                        ? "border-yellow-500 bg-yellow-500/10"
                        : "border-gray-700 bg-gray-900 hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-base font-semibold text-white">{idea.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        idea.feasibility === "high"
                          ? "bg-green-900/50 text-green-400 border border-green-800"
                          : idea.feasibility === "medium"
                          ? "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                          : "bg-red-900/50 text-red-400 border border-red-800"
                      }`}>
                        {idea.feasibility === "high" ? "易实现" : idea.feasibility === "medium" ? "中等" : "有挑战"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{idea.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {idea.features.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-gray-800 text-gray-400">
                          {f}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {selectedIdea && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">补充说明（可选）</label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="对选中的方案有什么想法或调整？"
                      rows={2}
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => { setStage("input"); setKeyword(""); setBrainstormResult(null); setSelectedIdea(null); }}
                      className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 text-sm transition-colors"
                    >
                      换个关键词
                    </button>
                    <button
                      onClick={() => void handleRefine()}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-medium text-sm hover:from-yellow-500 hover:to-orange-500 transition-all"
                    >
                      细化这个方案
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {stage === "result" && refinedResult && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-white">Agent 产品需求文档</h2>
              </div>

              <div className="bg-gradient-to-br from-yellow-950/60 to-orange-950/60 border border-yellow-800/30 rounded-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-2">{refinedResult.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{refinedResult.description}</p>
                <div className="text-xs text-gray-500">目标用户：{refinedResult.targetUser}</div>
              </div>

              {refinedResult.features.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">功能清单</h4>
                  <div className="space-y-2">
                    {refinedResult.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          f.priority === "P0" ? "bg-red-900/50 text-red-400" :
                          f.priority === "P1" ? "bg-yellow-900/50 text-yellow-400" :
                          "bg-gray-700 text-gray-400"
                        }`}>
                          {f.priority}
                        </span>
                        <div>
                          <span className="text-sm text-white">{f.name}</span>
                          <p className="text-xs text-gray-500">{f.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {refinedResult.userJourney.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">用户旅程</h4>
                  <div className="space-y-3">
                    {refinedResult.userJourney.map((step) => (
                      <div key={step.step} className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-yellow-900/50 text-yellow-400 text-xs flex items-center justify-center shrink-0">
                          {step.step}
                        </div>
                        <div>
                          <div className="text-sm text-white">{step.action}</div>
                          <div className="text-xs text-gray-500">{step.system}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {refinedResult.techStack && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-300 mb-3">技术栈</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {refinedResult.techStack.dataSources?.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">数据来源</span>
                        {refinedResult.techStack.dataSources.map((d, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 inline-block mr-1 mb-1">{d}</span>
                        ))}
                      </div>
                    )}
                    {refinedResult.techStack.apis?.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">API</span>
                        {refinedResult.techStack.apis.map((a, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 inline-block mr-1 mb-1">{a}</span>
                        ))}
                      </div>
                    )}
                    {refinedResult.techStack.tools?.length > 0 && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">AI 工具</span>
                        {refinedResult.techStack.tools.map((t, i) => (
                          <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 inline-block mr-1 mb-1">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                <h4 className="text-sm font-medium text-gray-300 mb-3">可行性评估</h4>
                <p className="text-sm text-gray-400">{refinedResult.feasibilityNotes}</p>
                <div className="mt-2">
                  <span className="text-xs text-gray-500">预计工作量：</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    refinedResult.estimatedEffort === "low"
                      ? "bg-green-900/50 text-green-400"
                      : refinedResult.estimatedEffort === "medium"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : "bg-red-900/50 text-red-400"
                  }`}>
                    {refinedResult.estimatedEffort === "low" ? "低" : refinedResult.estimatedEffort === "medium" ? "中" : "高"}
                  </span>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={() => {
                    setStage("input");
                    setKeyword("");
                    setBrainstormResult(null);
                    setSelectedIdea(null);
                    setRefinedResult(null);
                    setStreamText("");
                    setFeedback("");
                  }}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  再来一轮
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
