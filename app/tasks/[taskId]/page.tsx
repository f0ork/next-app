"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { TaskRun, TaskPhase, TaskEvent, ReportSection } from "@/types";
import { useTaskStream } from "@/app/hooks/useTaskStream";

interface LogEntry {
  id: string;
  message: string;
  at: string;
  type: "log" | "phase" | "error";
}

interface State {
  task: TaskRun | null;
  phase: TaskPhase | null;
  logs: LogEntry[];
  sections: ReportSection[];
  streamBuffer: string;
  reportId: string | null;
  error: string;
}

type Action =
  | { type: "SET_TASK"; task: TaskRun }
  | { type: "SET_PHASE"; phase: TaskPhase }
  | { type: "ADD_LOG"; entry: LogEntry }
  | { type: "ADD_SECTION"; section: ReportSection }
  | { type: "DELTA"; text: string }
  | { type: "SET_REPORT"; reportId: string }
  | { type: "SET_ERROR"; error: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_TASK": return { ...s, task: a.task, phase: a.task.phase };
    case "SET_PHASE": return { ...s, phase: a.phase };
    case "ADD_LOG": return { ...s, logs: [...s.logs, a.entry] };
    case "ADD_SECTION": return { ...s, sections: [...s.sections, a.section], streamBuffer: "" };
    case "DELTA": return { ...s, streamBuffer: s.streamBuffer + a.text };
    case "SET_REPORT": return { ...s, reportId: a.reportId, streamBuffer: "" };
    case "SET_ERROR": return { ...s, error: a.error };
    default: return s;
  }
}

const phaseLabel: Record<string, string> = {
  executing: "深度调研中",
  reporting: "生成报告中",
  followup: "报告完成",
  clarifying: "需求分析中",
  failed: "出错",
};

const phaseColor: Record<string, string> = {
  executing: "text-yellow-400",
  reporting: "text-blue-400",
  followup: "text-green-400",
  clarifying: "text-purple-400",
  failed: "text-red-400",
};

export default function TaskRunPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    task: null, phase: null, logs: [], sections: [], streamBuffer: "", reportId: null, error: "",
  });

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d: { task?: TaskRun }) => { if (d.task) dispatch({ type: "SET_TASK", task: d.task }); });
  }, [taskId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  useTaskStream(taskId, (event: TaskEvent) => {
    const now = new Date().toISOString();
    if (event.type === "task.phase.changed") {
      dispatch({ type: "SET_PHASE", phase: event.phase });
      dispatch({ type: "ADD_LOG", entry: { id: event.at, message: phaseLabel[event.phase] ?? event.phase, at: event.at, type: "phase" } });
      if (event.phase === "followup" && state.reportId) {
        router.push(`/tasks/${taskId}/report`);
      }
    }
    if (event.type === "task.log") {
      dispatch({ type: "ADD_LOG", entry: { id: event.at + Math.random(), message: event.message, at: event.at, type: "log" } });
    }
    if (event.type === "assistant.message.delta") {
      dispatch({ type: "DELTA", text: event.delta });
    }
    if (event.type === "report.section.added") {
      dispatch({ type: "ADD_SECTION", section: event.section });
      dispatch({ type: "ADD_LOG", entry: { id: now + Math.random(), message: `章节完成：${event.section.title}`, at: now, type: "log" } });
    }
    if (event.type === "report.finalized") {
      dispatch({ type: "SET_REPORT", reportId: event.reportId });
      setTimeout(() => router.push(`/tasks/${taskId}/report`), 800);
    }
    if (event.type === "task.error") {
      dispatch({ type: "SET_ERROR", error: event.error });
      dispatch({ type: "ADD_LOG", entry: { id: event.at, message: `错误：${event.error}`, at: event.at, type: "error" } });
    }
  });

  const isRunning = state.phase && !["followup", "completed", "failed"].includes(state.phase);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      <header className="shrink-0 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/agents/research" className="text-gray-500 hover:text-gray-300 text-sm">← 重新开始</Link>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-sm text-gray-300 truncate max-w-xs">{state.task?.title ?? "加载中…"}</span>
        </div>
        {state.phase && (
          <div className="flex items-center gap-2">
            {isRunning && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
            <span className={`text-xs font-medium ${phaseColor[state.phase] ?? "text-gray-400"}`}>
              {phaseLabel[state.phase] ?? state.phase}
            </span>
          </div>
        )}
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左侧：实时日志 */}
        <div className="w-72 shrink-0 border-r border-gray-800 flex flex-col bg-[#080810]">
          <div className="px-4 py-3 border-b border-gray-800">
            <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider">调研进展</h2>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {state.logs.length === 0 && (
              <p className="text-xs text-gray-600">等待任务启动…</p>
            )}
            {state.logs.map((entry) => (
              <div key={entry.id} className={`flex gap-2 text-xs ${
                entry.type === "phase" ? "text-blue-400 font-medium" :
                entry.type === "error" ? "text-red-400" : "text-gray-400"
              }`}>
                <span className="shrink-0 mt-0.5">
                  {entry.type === "phase" ? "▶" : entry.type === "error" ? "✕" : "·"}
                </span>
                <span className="leading-relaxed">{entry.message}</span>
              </div>
            ))}
            {isRunning && (
              <div className="flex gap-2 text-xs text-gray-600">
                <span className="shrink-0">·</span>
                <span className="animate-pulse">处理中…</span>
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* 右侧：报告内容逐步展示 */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {state.sections.length === 0 && !state.streamBuffer && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-blue-500/60 animate-pulse" />
                <div className="absolute inset-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <span className="text-xl">🔍</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                {state.phase === "executing" ? "正在深度调研，请稍候…" :
                 state.phase === "reporting" ? "正在整理报告内容…" :
                 "正在准备…"}
              </p>
            </div>
          )}

          {state.streamBuffer && (
            <div className="mb-6 bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs text-blue-400 font-medium">正在生成…</span>
              </div>
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {state.streamBuffer}
                <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              </pre>
            </div>
          )}

          {state.sections.length > 0 && (
            <div className="space-y-5">
              {[...state.sections]
                .sort((a, b) => a.order - b.order)
                .map((sec, i) => (
                  <div
                    key={sec.id}
                    className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <h3 className="text-base font-semibold text-white mb-3">{sec.title}</h3>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{sec.markdown}</p>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
