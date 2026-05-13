"use client";

import { useEffect, useReducer, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { TaskRun, TaskPhase, TaskEvent } from "@/types";
import { useTaskStream } from "@/app/hooks/useTaskStream";
import { useSelectedModel } from "@/app/components/ModelPicker";

interface LogEntry {
  id: string;
  text: string;
  kind: "phase" | "delta" | "section" | "error";
}

interface State {
  title: string;
  phase: TaskPhase | null;
  logs: LogEntry[];
  error: string;
  reportId: string | null;
}

type Action =
  | { type: "SET_TASK"; task: TaskRun }
  | { type: "SET_PHASE"; phase: TaskPhase }
  | { type: "APPEND_DELTA"; text: string }
  | { type: "ADD_LOG"; entry: LogEntry }
  | { type: "SET_REPORT"; reportId: string }
  | { type: "SET_ERROR"; error: string };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_TASK":
      return { ...s, title: a.task.title, phase: a.task.phase };
    case "SET_PHASE":
      return { ...s, phase: a.phase };
    case "APPEND_DELTA": {
      const last = s.logs[s.logs.length - 1];
      if (last?.kind === "delta") {
        const updated = { ...last, text: last.text + a.text };
        return { ...s, logs: [...s.logs.slice(0, -1), updated] };
      }
      return {
        ...s,
        logs: [
          ...s.logs,
          { id: crypto.randomUUID(), text: a.text, kind: "delta" },
        ],
      };
    }
    case "ADD_LOG":
      return { ...s, logs: [...s.logs, a.entry] };
    case "SET_REPORT":
      return { ...s, reportId: a.reportId };
    case "SET_ERROR":
      return { ...s, error: a.error };
    default:
      return s;
  }
}

const PHASE_TEXT: Record<string, string> = {
  clarifying: "正在分析需求…",
  executing: "正在深度调研…",
  reporting: "正在生成报告…",
  followup: "报告已完成",
  failed: "任务出错",
};

const PHASE_STEPS: Record<string, number> = {
  clarifying: 1,
  executing: 2,
  reporting: 3,
  followup: 4,
};

const PHASE_ICONS: Record<string, string> = {
  clarifying: "分析中",
  executing: "调研中",
  reporting: "生成中",
  followup: "完成",
  failed: "出错",
};

export default function TaskRunPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [state, dispatch] = useReducer(reducer, {
    title: "",
    phase: null,
    logs: [],
    error: "",
    reportId: null,
  });

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d: { task?: TaskRun }) => {
        if (d.task) dispatch({ type: "SET_TASK", task: d.task });
      });
  }, [taskId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.logs]);

  const handleEvent = useCallback(
    (event: TaskEvent) => {
      if (event.type === "task.phase.changed") {
        dispatch({ type: "SET_PHASE", phase: event.phase });
        dispatch({
          type: "ADD_LOG",
          entry: {
            id: event.at,
            text: PHASE_ICONS[event.phase] ?? event.phase,
            kind: "phase",
          },
        });
      }
      if (event.type === "assistant.message.delta") {
        dispatch({ type: "APPEND_DELTA", text: event.delta });
      }
      if (event.type === "task.log") {
        dispatch({
          type: "ADD_LOG",
          entry: {
            id: event.at + Math.random(),
            text: event.message,
            kind: "phase",
          },
        });
      }
      if (event.type === "report.section.added") {
        dispatch({
          type: "ADD_LOG",
          entry: {
            id: event.at + Math.random(),
            text: `✓ ${event.section.title}`,
            kind: "section",
          },
        });
      }
      if (event.type === "report.finalized") {
        dispatch({ type: "SET_REPORT", reportId: event.reportId });
        setTimeout(() => router.push(`/tasks/${taskId}/report`), 800);
      }
      if (event.type === "task.error") {
        dispatch({ type: "SET_ERROR", error: event.error });
        dispatch({
          type: "ADD_LOG",
          entry: {
            id: event.at,
            text: `错误：${event.error}`,
            kind: "error",
          },
        });
      }
    },
    [router, taskId]
  );

  useTaskStream(taskId, handleEvent);

  const { modelId } = useSelectedModel();
  const step = PHASE_STEPS[state.phase ?? ""] ?? 0;
  const isRunning =
    state.phase &&
    !["followup", "completed", "failed"].includes(state.phase);
  const isFailed = state.phase === "failed";

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex flex-col">
      <header className="shrink-0 px-6 py-4 flex items-center gap-3">
        <Link
          href="/agents/research"
          className="text-gray-600 hover:text-gray-400 text-sm transition-colors"
        >
          ← 重新开始
        </Link>
        {state.title && (
          <>
            <div className="w-px h-4 bg-gray-800" />
            <span className="text-sm text-gray-300 truncate max-w-xs">
              {state.title}
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-1 rounded-md">
            {modelId.split("/").pop()}
          </span>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <div className="w-full max-w-2xl space-y-8">
          <div className="text-center space-y-4">
            {!isFailed && (
              <div className="relative w-20 h-20 mx-auto">
                <div
                  className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping"
                  style={{ animationDuration: "2s" }}
                />
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
              <p
                className={`text-sm font-medium ${
                  isFailed ? "text-red-400" : "text-blue-400"
                }`}
              >
                {isFailed
                  ? state.error
                  : PHASE_TEXT[state.phase ?? ""] ?? "正在准备…"}
              </p>
            </div>
          </div>

          {!isFailed && (
            <div className="flex items-center gap-0">
              {[
                { n: 1, label: "需求分析" },
                { n: 2, label: "深度调研" },
                { n: 3, label: "生成报告" },
              ].map(({ n, label }, i) => (
                <div key={n} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                        step > n
                          ? "bg-blue-500 text-white"
                          : step === n
                          ? "bg-blue-500/20 border-2 border-blue-500 text-blue-400"
                          : "bg-gray-800 border border-gray-700 text-gray-600"
                      }`}
                    >
                      {step > n ? "✓" : n}
                    </div>
                    <span
                      className={`text-xs mt-1.5 transition-colors duration-500 ${
                        step >= n ? "text-gray-400" : "text-gray-700"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div
                      className={`h-px flex-1 mb-5 mx-1 transition-all duration-700 ${
                        step > n ? "bg-blue-500" : "bg-gray-800"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-[#080812] border border-gray-800/80 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-800/60 flex items-center gap-2">
              {isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              )}
              {!isRunning && (
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
              )}
              <span className="text-xs text-gray-500">
                AI 实时输出
              </span>
              <span className="text-xs text-gray-700 ml-auto">
                {state.logs.filter((l) => l.kind === "delta").length > 0
                  ? `${state.logs
                      .filter((l) => l.kind === "delta")
                      .reduce((s, l) => s + l.text.length, 0)
                      .toLocaleString()} 字`
                  : ""}
              </span>
            </div>

            <div
              ref={scrollRef}
              className="h-64 overflow-y-auto px-3 py-2 space-y-1"
            >
              {state.logs.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <span className="text-gray-700 text-sm animate-pulse">
                    等待 AI 响应…
                  </span>
                </div>
              )}
              {state.logs.map((entry) => {
                if (entry.kind === "phase") {
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 py-1"
                    >
                      <span className="text-blue-500 text-xs">▶</span>
                      <span className="text-xs text-blue-400 font-medium">
                        {entry.text}
                      </span>
                    </div>
                  );
                }
                if (entry.kind === "section") {
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 py-1"
                    >
                      <span className="text-green-500 text-xs">✓</span>
                      <span className="text-xs text-green-400 font-medium">
                        {entry.text}
                      </span>
                    </div>
                  );
                }
                if (entry.kind === "error") {
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 py-1"
                    >
                      <span className="text-red-500 text-xs">✕</span>
                      <span className="text-xs text-red-400">
                        {entry.text}
                      </span>
                    </div>
                  );
                }
                return (
                  <span
                    key={entry.id}
                    className="text-xs text-gray-400 leading-relaxed whitespace-pre-wrap font-mono"
                  >
                    {entry.text}
                  </span>
                );
              })}
              {isRunning && state.logs.length > 0 && (
                <span className="inline-block w-1.5 h-3 bg-blue-400 animate-pulse ml-0.5" />
              )}
            </div>
          </div>

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
