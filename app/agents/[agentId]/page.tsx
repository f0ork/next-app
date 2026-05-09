"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AgentTaskInput, ResearchMode } from "@/types";

const modeOptions: Array<{ value: ResearchMode; label: string; desc: string }> = [
  { value: "competitor_analysis", label: "竞品分析", desc: "深入分析竞争对手产品、策略与市场定位" },
  { value: "tech_selection", label: "技术选型", desc: "对比技术方案，评估适合度与风险" },
  { value: "general_research", label: "通用调研", desc: "任意主题的系统性信息收集与整理" },
];

export default function AgentIntakePage({ params }: { params: Promise<{ agentId: string }> }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<AgentTaskInput>>({ mode: "competitor_analysis" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const agentId = "research";

  const handleSubmit = async () => {
    if (!form.mode || !form.topic?.trim() || !form.goal?.trim()) {
      setError("请填写调研类型、主题和核心问题");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/agents/${agentId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: form }),
      });
      const data = (await res.json()) as { task?: { id: string }; error?: string };
      if (!res.ok || !data.task) throw new Error(data.error ?? "创建失败");
      router.push(`/tasks/${data.task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-100 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/agents" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">← 返回</a>
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xl">
              🔍
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">资讯收集</h1>
              <p className="text-sm text-gray-400">AI 引导式需求收集，产出专业调研报告</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">调研类型</label>
            <div className="grid grid-cols-1 gap-3">
              {modeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, mode: opt.value }))}
                  className={`text-left px-4 py-3 rounded-xl border transition-all ${
                    form.mode === opt.value
                      ? "border-blue-500 bg-blue-500/10 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              调研主题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.topic ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              placeholder="例如：国内 AI 编程助手工具"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              核心问题 <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={form.goal ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
              placeholder="例如：了解主流 AI 编程工具的核心差异和优劣势，为团队技术选型提供参考"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              约束条件 <span className="text-gray-500 font-normal">（可选）</span>
            </label>
            <textarea
              rows={2}
              value={form.constraints ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, constraints: e.target.value }))}
              placeholder="例如：只考虑支持中文的产品，预算范围 xxx"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "正在启动任务…" : "开始调研"}
          </button>
        </div>
      </div>
    </div>
  );
}
