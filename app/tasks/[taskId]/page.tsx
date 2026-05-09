"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { TaskRun, TaskPhase, TaskEvent } from "@/types";
import { useTaskStream } from "@/app/hooks/useTaskStream";
import ReactMarkdown from "react-markdown";

interface ChatLine {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface State {
  task: TaskRun | null;
  phase: TaskPhase | null;
  lines: ChatLine[];
  streamingText: string;
  error: string;
}

type Action =
  | { type: "SET_TASK"; task: TaskRun }
  | { type: "SET_PHASE"; phase: TaskPhase }
  | { type: "DELTA"; text: string }
  | { type: "FLUSH_STREAM" }
  | { type: "SET_ERROR"; error: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_TASK":
      return { ...state, task: action.task, phase: action.task.phase };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "DELTA":
      return { ...state, streamingText: state.streamingText + action.text };
    case "FLUSH_STREAM": {
      if (!state.streamingText) return state;
      return {
        ...state,
        lines: [...state.lines, { role: "assistant", content: state.streamingText }],
        streamingText: "",
      };
    }
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

export default function TaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, {
    task: null, phase: null, lines: [], streamingText: "", error: "",
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/tasks/${taskId}`)
      .then((r) => r.json())
      .then((d: { task?: TaskRun }) => { if (d.task) dispatch({ type: "SET_TASK", task: d.task }); });

    fetch(`/api/tasks/${taskId}/messages`)
      .then((r) => r.json())
      .then((d: { messages?: Array<{ role: "user" | "assistant"; content: string }> }) => {
        if (d.messages) {
          const lines: ChatLine[] = d.messages
            .filter((m) => m.role !== undefined)
            .map((m) => ({ role: m.role, content: m.content }));
          lines.forEach((l) => dispatch({ type: "FLUSH_STREAM" }));
          if (lines.length) dispatch({ type: "FLUSH_STREAM" });
        }
      });
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.lines, state.streamingText]);

  useTaskStream(taskId, (event: TaskEvent) => {
    if (event.type === "task.phase.changed") {
      dispatch({ type: "SET_PHASE", phase: event.phase });
      if (event.phase === "followup") {
        dispatch({ type: "FLUSH_STREAM" });
        router.push(`/tasks/${taskId}/report`);
      }
    }
    if (event.type === "assistant.message.delta") {
      dispatch({ type: "DELTA", text: event.delta });
    }
    if (event.type === "report.finalized") {
      dispatch({ type: "FLUSH_STREAM" });
      router.push(`/tasks/${taskId}/report`);
    }
    if (event.type === "task.error") {
      dispatch({ type: "FLUSH_STREAM" });
      dispatch({ type: "SET_ERROR", error: event.error });
    }
  });

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    dispatch({ type: "FLUSH_STREAM" });
    const lines = [{ role: "user" as const, content }];
    lines.forEach(() => dispatch({ type: "FLUSH_STREAM" }));

    await fetch(`/api/tasks/${taskId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSending(false);
  };

  const phaseLabel: Record<string, string> = {
    intake: "初始化",
    clarifying: "信息收集中",
    executing: "分析中",
    reporting: "生成报告中",
    followup: "报告完成",
    failed: "出错",
  };

  const isActive = state.phase && !["completed", "failed", "followup"].includes(state.phase);

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-100 flex flex-col">
      <header className="shrink-0 border-b border-gray-800 bg-[#0a0a14] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/agents" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← 返回</a>
          <div className="w-px h-4 bg-gray-700" />
          <span className="text-sm font-medium text-white">{state.task?.title ?? "加载中…"}</span>
        </div>
        {state.phase && (
          <div className="flex items-center gap-2">
            {isActive && <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
            <span className="text-xs text-gray-400">{phaseLabel[state.phase] ?? state.phase}</span>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {state.lines.map((line, i) => (
            <div key={i} className={`flex ${line.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                line.role === "user"
                  ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-800 text-gray-100 rounded-tl-sm"
              }`}>
                {line.role === "assistant"
                  ? <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{line.content}</ReactMarkdown></div>
                  : <span className="whitespace-pre-wrap">{line.content}</span>
                }
              </div>
            </div>
          ))}

          {state.streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[80%] bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm">
                <div className="prose prose-invert prose-sm max-w-none"><ReactMarkdown>{state.streamingText}</ReactMarkdown></div>
                <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {isActive && !state.streamingText && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {state.error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
              ❌ {state.error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {state.phase === "clarifying" || state.phase === "followup" ? (
        <div className="shrink-0 border-t border-gray-800 bg-[#0a0a14] px-6 py-4">
          <div className="max-w-3xl mx-auto flex gap-3">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="回复 AI 的问题，或补充更多信息…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
            >
              发送
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
