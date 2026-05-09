"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { TaskRun, TaskPhase, TaskEvent } from "@/types";
import { useTaskStream } from "@/app/hooks/useTaskStream";

interface State {
  title: string;
  phase: TaskPhase | null;
  logs: string[];
  error: string;
  reportId: string | null;
}

type Action =
  | { type: "SET_TASK"; task: TaskRun }
  | { type: "SET_PHASE"; phase: TaskPhase }
  | { type: "ADD_LOG"; message: string }
  | { type: "SET_REPORT"; reportId: string }
  | { type: "SET_ERROR"; error: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_TASK":   return { ...s, title: a.task.title, phase: a.task.phase };
    case "SET_PHASE":  return { ...s, phase: a.phase };
    case "ADD_LOG":    return { ...s, logs: [...s.logs.slice(-60), a.message] };
    case "SET_REPORT": return { ...s, reportId: a.reportId };
    case "SET_ERROR":  return { ...s, error: a.error };
    default: return s;
  }
}

const PHASE_TEXT: Record<string, string> = {
  clarifying: "正在分析需求…",
  executing:  "正在深度调研…",
  reporting:  "正在生成报告…",
  followup:   "报告已完成",
  failed:     "任务出错",
};

const PHASE_STEPS: Record<string, number> = {
  clarifying: 1,
  executing:  2,
  reporting:  3,
  followup:   4,
};

export default function TaskRunPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    title: "", phase: null, logs: [], error: "", reportId: null,
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
    if (event.type === "task.phase.changed") {
      dispatch({ type: "SET_PHASE", phase: event.phase });
      if (event.phase === "followup" && state.reportId) {
        router.push(`/tasks/${taskId}/report`);
      }
    }
    if (event.type === "task.log") {
      dispatch({ type: "ADD_LOG", message: event.message });
    }
    if (event.type === "report.section.added") {
      dispatch({ type: "ADD_LOG", message: `✓ ${event.section.title}` });
    }
    if (event.type === "report.finalized") {
      dispatch({ type: "SET_REPORT", reportId: event.reportId });
      setTimeout(() => router.push(`/tasks/${taskId}/report`), 600);
    }
    if (event.type === "task.error") {
      dispatch({ type: "SET_ERROR", error: event.error });
    }
  });

  const step = PHASE_STEPS[state.phase ?? ""] ?? 0;
  const isRunning = state.phase && !["followup", "completed", "failed"].includes(state.phase);
  const isFailed = state.phase === "failed";

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      <header className="shrink-0 px-6 py-4 flex items-center gap-3">
        <Link href="/agents/research" className="text-gray-600 hover:text-gray-400 text-sm transition-colors">
          ← 重新开始
        </Link>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-lg space-y-10">

          {/* 主状态区 */}
          <div className="text-center space-y-4">
            {!isFailed && (
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping" style={{ animationDuration: "2s" }} />
                <div className="absolute inset-1 rounded-full border-2 border-blue-500/40 animate-pulse" />
                <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 flex items-center justify-center">
                  <span className="text-2xl">🔍</span>
                </div>
              </div>
            )}
            {isFailed && (
              <div className="w-20 h-20 mx-auto rounded-full bg-red-900/30 border border-red-800/50 flex items-center justify-center text-3xl">
                ✕
              </div>
            )}

            <div>
              <h1 className="text-xl font-semibold text-white mb-1">
                {state.title || "调研任务"}
              </h1>
              <p className={`text-sm font-medium ${isFailed ? "text-red-400" : "text-blue-400"}`}>
                {isFailed ? state.error : (PHASE_TEXT[state.phase ?? ""] ?? "正在准备…")}
              </p>
            </div>
          </div>

          {/* 进度步骤 */}
          {!isFailed && (
            <div className="flex items-center gap-0">
              {[
                { n: 1, label: "需求分析" },
                { n: 2, label: "深度调研" },
                { n: 3, label: "生成报告" },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                      step > n ? "bg-blue-500 text-white" :
                      step === n ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400" :
                      "bg-gray-800 border border-gray-700 text-gray-600"
                    }`}>
                      {step > n ? "✓" : n}
                    </div>
                    <span className={`text-xs mt-1.5 transition-colors duration-500 ${
                      step >= n ? "text-gray-400" : "text-gray-700"
                    }`}>
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`h-px flex-1 mb-5 mx-1 transition-all duration-700 ${
                      step > n + 0 ? "bg-blue-500" : "bg-gray-800"
                    }`} />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 日志小窗 */}
          {state.logs.length > 0 && !isFailed && (
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-800/60 flex items-center gap-2">
                {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                <span className="text-xs text-gray-500">进度日志</span>
              </div>
              <div className="h-28 overflow-y-auto px-3 py-2 space-y-1">
                {state.logs.map((msg, i) => (
                  <p key={i} className="text-xs text-gray-500 leading-relaxed">{msg}</p>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}

          {isFailed && (
            <div className="text-center">
              <Link
                href="/agents/research"
                className="inline-block px-6 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition-colors"
              >
                重新开始调研
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
