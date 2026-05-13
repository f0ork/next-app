"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { ResearchReport, ReportCard, ReportSection, TaskRun } from "@/types";
import { useSelectedModel } from "@/app/components/ModelPicker";

function ExpandableCard({ card, onDrilldown }: { card: ReportCard; onDrilldown: (q: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (card.type === "insight") {
    return (
      <div className="bg-blue-950/40 border border-blue-800/50 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-900/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">💡</span>
            <span className="text-sm font-semibold text-blue-200">{card.title}</span>
          </div>
          <svg
            className={`w-4 h-4 text-blue-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <div className="px-5 pb-4 space-y-2 border-t border-blue-800/30">
            {card.points.map((p, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-blue-400 shrink-0 mt-0.5">•</span>
                <span className="text-gray-300">{p}</span>
              </div>
            ))}
            <button
              onClick={() => onDrilldown(`深入分析：${card.title}`)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              深入探索这个方向 →
            </button>
          </div>
        )}
      </div>
    );
  }

  if (card.type === "comparison") {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">⚖️</span>
            <span className="text-sm font-semibold text-gray-200">{card.title}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <div className="border-t border-gray-700 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800/50">
                  {card.columns.map((col) => (
                    <th key={col} className="px-4 py-2.5 text-left text-gray-400 font-medium whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, i) => (
                  <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                    {card.columns.map((col) => (
                      <td key={col} className="px-4 py-2.5 text-gray-300">{row[col] ?? "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-gray-800">
              <button
                onClick={() => onDrilldown(`进一步分析对比表：${card.title}`)}
                className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
              >
                基于这个对比深入分析 →
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (card.type === "risk") {
    const colors = {
      low: "border-green-800/50 bg-green-950/30",
      medium: "border-yellow-800/50 bg-yellow-950/30",
      high: "border-red-800/50 bg-red-950/30",
    };
    const labelColors = {
      low: "text-green-400 border-green-700",
      medium: "text-yellow-400 border-yellow-700",
      high: "text-red-400 border-red-700",
    };
    const labels = { low: "低风险", medium: "中风险", high: "高风险" };
    const icons = { low: "✓", medium: "!", high: "⚠" };
    return (
      <div className={`border rounded-2xl overflow-hidden ${colors[card.level]}`}>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${labelColors[card.level]}`}>
              {icons[card.level]} {labels[card.level]}
            </span>
            <span className="text-sm font-semibold text-gray-200">{card.title}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <div className="px-5 pb-4 border-t border-white/10 space-y-2">
            <p className="text-sm text-gray-300 mt-3">{card.description}</p>
            {card.mitigation && (
              <p className="text-xs text-gray-400 bg-black/20 rounded-lg px-3 py-2">
                应对策略：{card.mitigation}
              </p>
            )}
            <button
              onClick={() => onDrilldown(`分析风险应对方案：${card.title}`)}
              className="mt-2 text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1"
            >
              探讨应对策略 →
            </button>
          </div>
        )}
      </div>
    );
  }

  if (card.type === "timeline") {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-base">📅</span>
            <span className="text-sm font-semibold text-gray-200">{card.title}</span>
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            viewBox="0 0 20 20" fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        {expanded && (
          <div className="px-5 pb-4 border-t border-gray-700 space-y-3 pt-4">
            {card.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
                  {i < card.items.length - 1 && <div className="w-px flex-1 bg-gray-700 mt-1 mb-0" />}
                </div>
                <div className="pb-3">
                  <div className="text-xs font-medium text-blue-300">{item.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default function ReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [task, setTask] = useState<TaskRun | null>(null);
  const [drilldownTopic, setDrilldownTopic] = useState("");
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/report`)
      .then((r) => r.json())
      .then((d: { report?: ResearchReport }) => { if (d.report) setReport(d.report); });
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d: { task?: TaskRun }) => { if (d.task) setTask(d.task); });
  }, [taskId]);

  const handleDrilldown = async (topic: string) => {
    if (launching) return;
    setLaunching(true);
    try {
      const res = await fetch("/api/agents/research/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, selections: [] }),
      });
      const data = (await res.json()) as { task?: { id: string } };
      if (data.task) window.location.href = `/tasks/${data.task.id}`;
    } finally {
      setLaunching(false);
    }
  };

  const { modelId } = useSelectedModel();

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-gray-400 text-sm">加载报告中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      <header className="border-b border-gray-800 bg-[#080810] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/agents/research" className="text-gray-500 hover:text-gray-300 text-sm">← 新调研</Link>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-sm text-gray-300 truncate max-w-xs">{task?.title ?? "调研报告"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-1 rounded-md">
            {modelId.split("/").pop()}
          </span>
          <span className="text-xs text-green-400 bg-green-900/30 border border-green-800/50 px-2.5 py-0.5 rounded-full">
            报告已完成
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* 摘要卡片 */}
        <div className="bg-gradient-to-br from-blue-950/60 to-indigo-950/60 border border-blue-800/30 rounded-2xl p-6">
          <h1 className="text-xl font-bold text-white mb-2">{report.summary.title}</h1>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{report.summary.abstract}</p>
          <div className="space-y-1.5">
            {report.summary.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-blue-400 font-semibold shrink-0">{i + 1}.</span>
                <span className="text-gray-200">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 数据卡片（可展开） */}
        {report.cards.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">数据洞察</h2>
            <div className="space-y-3">
              {report.cards.map((card: ReportCard) => (
                <ExpandableCard
                  key={card.id}
                  card={card}
                  onDrilldown={(q) => void handleDrilldown(q)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 章节内容 */}
        {report.sections.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">详细分析</h2>
            {[...report.sections]
              .sort((a: ReportSection, b: ReportSection) => a.order - b.order)
              .map((sec: ReportSection) => (
                <div key={sec.id} className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-3">{sec.title}</h3>
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{sec.markdown}</p>
                </div>
              ))}
          </div>
        )}

        {/* 追问建议 */}
        {report.followupSuggestions.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">深入探索方向</h2>
            <div className="grid grid-cols-1 gap-2">
              {report.followupSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => void handleDrilldown(s)}
                  disabled={launching}
                  className="text-left px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/50 text-sm text-gray-300 hover:border-blue-600 hover:bg-blue-900/10 hover:text-white disabled:opacity-50 transition-all flex items-center justify-between group"
                >
                  <span>{s}</span>
                  <span className="text-gray-600 group-hover:text-blue-400 transition-colors shrink-0 ml-3">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 自定义追问 */}
        <div className="border-t border-gray-800 pt-6 space-y-3">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">自定义深入调研</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={drilldownTopic}
              onChange={(e) => setDrilldownTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && drilldownTopic.trim()) void handleDrilldown(drilldownTopic.trim()); }}
              placeholder="输入你想深入调研的方向…"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => drilldownTopic.trim() && void handleDrilldown(drilldownTopic.trim())}
              disabled={!drilldownTopic.trim() || launching}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
            >
              {launching ? "启动中…" : "调研"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
