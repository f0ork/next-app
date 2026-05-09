"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { AnalyzeResult, Dimension, DimensionSelection } from "@/types";
import ModelPicker, { useSelectedModel } from "@/app/components/ModelPicker";

type Stage = "input" | "analyzing" | "selecting" | "starting";

function DimensionCard({
  dim,
  selections,
  onChange,
}: {
  dim: Dimension;
  selections: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggle = (val: string) => {
    if (dim.multiple) {
      onChange(selections.includes(val) ? selections.filter((v) => v !== val) : [...selections, val]);
    } else {
      onChange(selections[0] === val ? [] : [val]);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-white">{dim.question}</h3>
        {dim.hint && <p className="text-xs text-gray-500 mt-0.5">{dim.hint}</p>}
        {dim.multiple && <p className="text-xs text-gray-600 mt-0.5">可多选</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {dim.options.map((opt) => {
          const selected = selections.includes(opt.value);
          return (
            <button
              key={opt.value}
              onClick={() => toggle(opt.value)}
              className={`group relative px-3 py-2 rounded-xl border text-left transition-all ${
                selected
                  ? "border-blue-500 bg-blue-500/15 text-white"
                  : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                  selected ? "border-blue-400 bg-blue-400" : "border-gray-600 group-hover:border-gray-400"
                }`}>
                  {selected && (
                    <svg width="7" height="5" viewBox="0 0 7 5" fill="none">
                      <path d="M1 2.5L2.8 4.3L6 1" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              {opt.description && (
                <p className="text-xs text-gray-500 mt-1 ml-5">{opt.description}</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ResearchIntakePage() {
  const router = useRouter();
  const { modelId } = useSelectedModel();
  const [stage, setStage] = useState<Stage>("input");
  const [topic, setTopic] = useState("");
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [selectionMap, setSelectionMap] = useState<Record<string, string[]>>({});
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAnalyze = async () => {
    if (!topic.trim()) return;
    setStage("analyzing");
    setError("");
    try {
      const res = await fetch("/api/agents/research/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const data = (await res.json()) as { result?: AnalyzeResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error ?? "分析失败");
      setAnalyzeResult(data.result);
      const init: Record<string, string[]> = {};
      data.result.dimensions.forEach((d: Dimension) => { init[d.id] = []; });
      setSelectionMap(init);
      setStage("selecting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("input");
    }
  };

  const handleStart = async () => {
    if (!analyzeResult) return;
    setStage("starting");
    const selections: DimensionSelection[] = analyzeResult.dimensions.map((d: Dimension) => ({
      dimensionId: d.question,
      selected: selectionMap[d.id] ?? [],
    }));

    try {
      const res = await fetch("/api/agents/research/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: analyzeResult.topic, selections, modelId }),
      });
      const data = (await res.json()) as { task?: { id: string }; error?: string };
      if (!res.ok || !data.task) throw new Error(data.error ?? "创建失败");
      router.push(`/tasks/${data.task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setStage("selecting");
    }
  };

  const totalSelected = Object.values(selectionMap).reduce((sum, v) => sum + v.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      <header className="shrink-0 border-b border-gray-800 px-6 py-3 flex items-center gap-3">
        <a href="/agents" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← 返回</a>
        <div className="w-px h-4 bg-gray-800" />
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="text-sm font-medium text-gray-200">资讯收集</span>
        </div>
        <div className="ml-auto">
          <ModelPicker />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">

          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-white text-center">
              {stage === "selecting" && analyzeResult
                ? analyzeResult.topic
                : "你想调研什么？"}
            </h1>
            {stage === "selecting" && analyzeResult && (
              <p className="text-center text-gray-400 text-sm">{analyzeResult.summary}</p>
            )}
          </div>

          {(stage === "input" || stage === "analyzing") && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAnalyze(); }}
                  placeholder="例如：国内主流 AI 编程助手工具对比"
                  disabled={stage === "analyzing"}
                  className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-5 py-4 text-base text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
                />
                {stage === "analyzing" && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => void handleAnalyze()}
                disabled={!topic.trim() || stage === "analyzing"}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm"
              >
                {stage === "analyzing" ? "AI 正在分析需求维度…" : "分析需求"}
              </button>
            </div>
          )}

          {stage === "selecting" && analyzeResult && (
            <div className="space-y-5">
              {analyzeResult.dimensions.map((dim: Dimension) => (
                <div key={dim.id} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
                  <DimensionCard
                    dim={dim}
                    selections={selectionMap[dim.id] ?? []}
                    onChange={(vals) => setSelectionMap((m) => ({ ...m, [dim.id]: vals }))}
                  />
                </div>
              ))}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => { setStage("input"); setAnalyzeResult(null); }}
                  className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 text-sm transition-colors"
                >
                  重新输入
                </button>
                <button
                  onClick={() => void handleStart()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-500 hover:to-indigo-500 transition-all"
                >
                  {totalSelected > 0
                    ? `开始调研 (已选 ${totalSelected} 项偏好)`
                    : "开始调研"}
                </button>
              </div>
            </div>
          )}

          {stage === "starting" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">正在启动调研任务…</p>
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
