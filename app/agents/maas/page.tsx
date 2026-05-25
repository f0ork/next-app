"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Stage = "input" | "analyzing" | "result";

export default function MaasAgentPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [requirement, setRequirement] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const streamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    streamRef.current?.scrollTo({ top: streamRef.current.scrollHeight, behavior: "smooth" });
  }, [result]);

  const handleAnalyze = async () => {
    if (!requirement.trim()) return;
    setStage("analyzing");
    setResult("");
    setError("");

    try {
      const res = await fetch("/api/agents/maas/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requirement: requirement.trim() }),
      });

      if (!res.ok || !res.body) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? "分析失败");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        setResult(fullText);
      }

      setStage("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败");
      setStage("input");
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      <header className="border-b border-gray-800 bg-[#080810] px-6 py-3 flex items-center gap-3">
        <Link href="/agents" className="text-gray-500 hover:text-gray-300 text-sm">← 返回</Link>
        <div className="w-px h-4 bg-gray-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <span className="text-sm font-medium text-gray-200">MaaS选型助手</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-3xl space-y-6">

          {stage === "input" && (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">MaaS 平台选型助手</h1>
                <p className="text-gray-400 text-sm">描述你的业务需求，AI 自动搜索并对比主流 MaaS 平台</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  业务需求描述
                </label>
                <textarea
                  value={requirement}
                  onChange={(e) => setRequirement(e.target.value)}
                  placeholder="例如：我们需要一个AI平台来部署大语言模型，主要做智能客服场景，日调用量约10万次，预算每月5000元以内，要求支持微调和RAG…"
                  rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-teal-500 transition-colors resize-none"
                />
              </div>

              <button
                onClick={() => void handleAnalyze()}
                disabled={!requirement.trim()}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium text-sm hover:from-teal-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                开始分析
              </button>

              {error && (
                <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
            </>
          )}

          {stage === "analyzing" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-teal-400 text-sm">
                  <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  正在搜索 MaaS 平台信息并生成选型报告…
                </div>
              </div>

              <div
                ref={streamRef}
                className="bg-[#080812] border border-gray-800 rounded-xl h-96 overflow-y-auto px-5 py-4"
              >
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {result}
                  <span className="inline-block w-0.5 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />
                </pre>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">选型报告</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "maas-report.md";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:border-teal-500 hover:text-teal-400 transition-colors"
                  >
                    📥 导出 Markdown
                  </button>
                  <button
                    onClick={() => { setStage("input"); setResult(""); setRequirement(""); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
                  >
                    🔄 重新分析
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
                <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm text-gray-200">
                  {result}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
