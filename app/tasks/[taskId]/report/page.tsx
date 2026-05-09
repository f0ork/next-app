"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { ResearchReport, ReportCard, TaskRun } from "@/types";
import ReactMarkdown from "react-markdown";

function InsightCardView({ card }: { card: Extract<ReportCard, { type: "insight" }> }) {
  return (
    <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-blue-300 mb-2">{card.title}</h4>
      <ul className="space-y-1">
        {card.points.map((p, i) => (
          <li key={i} className="text-sm text-gray-300 flex gap-2">
            <span className="text-blue-400 shrink-0">•</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonCardView({ card }: { card: Extract<ReportCard, { type: "comparison" }> }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-gray-200">{card.title}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-800/50">
              {card.columns.map((col) => (
                <th key={col} className="px-3 py-2 text-left text-gray-400 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {card.rows.map((row, i) => (
              <tr key={i} className="border-t border-gray-800">
                {card.columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-gray-300">{row[col] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskCardView({ card }: { card: Extract<ReportCard, { type: "risk" }> }) {
  const colors = { low: "text-green-400 bg-green-900/30 border-green-800/50", medium: "text-yellow-400 bg-yellow-900/30 border-yellow-800/50", high: "text-red-400 bg-red-900/30 border-red-800/50" };
  const labels = { low: "低风险", medium: "中风险", high: "高风险" };
  return (
    <div className={`border rounded-xl p-4 ${colors[card.level]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full border border-current">{labels[card.level]}</span>
        <h4 className="text-sm font-semibold">{card.title}</h4>
      </div>
      <p className="text-sm text-gray-300 mb-1">{card.description}</p>
      {card.mitigation && <p className="text-xs text-gray-400">应对：{card.mitigation}</p>}
    </div>
  );
}

function TimelineCardView({ card }: { card: Extract<ReportCard, { type: "timeline" }> }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <h4 className="text-sm font-semibold text-gray-200 mb-3">{card.title}</h4>
      <div className="space-y-3">
        {card.items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
              {i < card.items.length - 1 && <div className="w-px flex-1 bg-gray-700 mt-1" />}
            </div>
            <div className="pb-3">
              <div className="text-xs font-medium text-blue-300">{item.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{item.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCardView({ card }: { card: ReportCard }) {
  if (card.type === "insight") return <InsightCardView card={card} />;
  if (card.type === "comparison") return <ComparisonCardView card={card} />;
  if (card.type === "risk") return <RiskCardView card={card} />;
  if (card.type === "timeline") return <TimelineCardView card={card} />;
  return null;
}

export default function ReportPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const [report, setReport] = useState<ResearchReport | null>(null);
  const [task, setTask] = useState<TaskRun | null>(null);
  const [followup, setFollowup] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}/report`)
      .then((r) => r.json())
      .then((d: { report?: ResearchReport }) => { if (d.report) setReport(d.report); });
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d: { task?: TaskRun }) => { if (d.task) setTask(d.task); });
  }, [taskId]);

  const handleFollowup = async () => {
    if (!followup.trim() || sending) return;
    setSending(true);
    await fetch(`/api/tasks/${taskId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: followup.trim() }),
    });
    setFollowup("");
    window.location.href = `/tasks/${taskId}`;
  };

  if (!report) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-gray-400 text-sm">加载报告中…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-100">
      <header className="border-b border-gray-800 bg-[#0a0a14] px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href={`/tasks/${taskId}`} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← 对话</a>
          <div className="w-px h-4 bg-gray-700" />
          <span className="text-sm font-medium text-white">{task?.title ?? "调研报告"}</span>
        </div>
        <span className="text-xs text-green-400 bg-green-900/30 border border-green-800/50 px-2 py-0.5 rounded-full">报告已生成</span>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-gradient-to-br from-blue-950/50 to-indigo-950/50 border border-blue-800/30 rounded-2xl p-6">
          <h1 className="text-2xl font-bold text-white mb-3">{report.summary.title}</h1>
          <p className="text-gray-300 text-sm leading-relaxed mb-4">{report.summary.abstract}</p>
          <div className="space-y-2">
            {report.summary.keyFindings.map((f, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-blue-400 font-medium shrink-0">{i + 1}.</span>
                <span className="text-gray-200">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {report.cards.length > 0 && (
          <div>
            <h2 className="text-base font-semibold text-gray-300 mb-3">数据洞察</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.cards.map((card) => <ReportCardView key={card.id} card={card} />)}
            </div>
          </div>
        )}

        {report.sections.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold text-gray-300">详细分析</h2>
            {[...report.sections].sort((a, b) => a.order - b.order).map((sec) => (
              <div key={sec.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
                <h3 className="text-base font-semibold text-white mb-3">{sec.title}</h3>
                <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{sec.markdown}</ReactMarkdown></div>
              </div>
            ))}
          </div>
        )}

        {report.followupSuggestions.length > 0 && (
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">建议进一步了解</h3>
            <div className="flex flex-wrap gap-2">
              {report.followupSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setFollowup(s)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-300 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-gray-800 pt-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">继续追问</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={followup}
              onChange={(e) => setFollowup(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleFollowup(); }}
              placeholder="基于报告提问，或要求深入分析某个方向…"
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleFollowup}
              disabled={!followup.trim() || sending}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              追问
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
