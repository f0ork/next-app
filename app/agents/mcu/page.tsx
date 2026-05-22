"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Stage = "input" | "analyzing" | "result";

export default function McuAgentPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [inputText, setInputText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"paste" | "file">("paste");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resultRef.current?.scrollTo({ top: resultRef.current.scrollHeight, behavior: "smooth" });
  }, [result]);

  const handleAnalyze = async () => {
    if (inputMode === "paste" && !inputText.trim()) return;
    if (inputMode === "file" && !pendingFile) return;

    setStage("analyzing");
    setResult("");
    setError("");

    try {
      const formData = new FormData();
      if (pendingFile && inputMode === "file") {
        formData.append("file", pendingFile);
      } else {
        formData.append("text", inputText.trim());
      }

      const res = await fetch("/api/agents/mcu/analyze", {
        method: "POST",
        body: formData,
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
          <span className="text-lg">⚡</span>
          <span className="text-sm font-medium text-gray-200">MCU手册速读</span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="w-full max-w-3xl space-y-6">

          {stage === "input" && (
            <>
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-white">MCU 数据手册速读</h1>
                <p className="text-gray-400 text-sm">上传 PDF 数据手册或粘贴章节文本，AI 提炼关键设计要点</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setInputMode("paste"); setPendingFile(null); }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    inputMode === "paste"
                      ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40"
                      : "text-gray-500 hover:text-gray-300 border border-gray-800"
                  }`}
                >
                  📝 粘贴文本
                </button>
                <button
                  onClick={() => { setInputMode("file"); setInputText(""); }}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    inputMode === "file"
                      ? "bg-cyan-600/20 text-cyan-400 border border-cyan-600/40"
                      : "text-gray-500 hover:text-gray-300 border border-gray-800"
                  }`}
                >
                  📄 上传 PDF
                </button>
              </div>

              {inputMode === "file" ? (
                <div
                  className="w-full border-2 border-dashed border-gray-700 rounded-xl px-6 py-10 text-center cursor-pointer hover:border-cyan-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file && file.type === "application/pdf") setPendingFile(file);
                  }}
                >
                  {pendingFile ? (
                    <div className="space-y-2">
                      <div className="text-3xl text-cyan-400">📄</div>
                      <p className="text-sm text-gray-300">{pendingFile.name}</p>
                      <p className="text-xs text-gray-500">{(pendingFile.size / 1024).toFixed(0)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingFile(null); }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-4xl text-gray-600">📄</div>
                      <p className="text-sm text-gray-400">拖拽或点击上传 MCU 数据手册 PDF</p>
                      <p className="text-xs text-gray-600">支持文本型 PDF（非扫描件）</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingFile(file);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="粘贴 MCU 数据手册的关键章节内容，例如：寄存器配置、引脚说明、电气特性、典型电路等…"
                  rows={12}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
                />
              )}

              <button
                onClick={() => void handleAnalyze()}
                disabled={(inputMode === "file" ? !pendingFile : !inputText.trim())}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-medium text-sm hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                <div className="inline-flex items-center gap-2 text-cyan-400 text-sm">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  AI 正在分析数据手册…
                </div>
              </div>

              <div
                ref={resultRef}
                className="bg-[#080812] border border-gray-800 rounded-xl h-96 overflow-y-auto px-5 py-4"
              >
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                  {result}
                  <span className="inline-block w-0.5 h-4 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
                </pre>
              </div>
            </div>
          )}

          {stage === "result" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">分析结果</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "mcu-analysis.md";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    📥 导出 Markdown
                  </button>
                  <button
                    onClick={() => {
                      const blob = new Blob([JSON.stringify({ content: result, analyzedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "mcu-analysis.json";
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:border-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    📥 导出 JSON
                  </button>
                  <button
                    onClick={() => { setStage("input"); setResult(""); setPendingFile(null); setInputText(""); }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors"
                  >
                    🔄 重新分析
                  </button>
                </div>
              </div>

              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
                <div className="prose prose-invert prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed text-sm text-gray-200">
                    {result}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
