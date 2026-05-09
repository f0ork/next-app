"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessage, { type Message } from "./ChatMessage";
import ChatInput from "./ChatInput";

let messageIdCounter = 0;
const nextId = () => String(++messageIdCounter);

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string, images: string[]) => {
    const userMessage: Message = {
      id: nextId(),
      role: "user",
      content: text,
      images: images.length > 0 ? images : undefined,
    };

    const assistantId = nextId();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, images, sessionId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        accumulated += decoder.decode(value, { stream: true });
        const parts = accumulated.split("\n\n");
        accumulated = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;
          try {
            const event = JSON.parse(dataLine.slice(6));

            if (event.type === "session") {
              setSessionId(event.sessionId as string);
            }

            if (event.type === "delta") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + (event.text as string) }
                    : m
                )
              );
            }

            if (event.type === "done" || event.type === "error") {
              const finalContent =
                event.type === "error"
                  ? `❌ 错误：${event.message as string}`
                  : undefined;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        isStreaming: false,
                        content: finalContent ?? m.content,
                      }
                    : m
                )
              );
            }
          } catch {
            // ignored
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                isStreaming: false,
                content: `❌ 请求失败：${err instanceof Error ? err.message : "未知错误"}`,
              }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a2e]">
      <header className="shrink-0 border-b border-gray-700 bg-[#0f0f1a] px-4 py-3 flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
          C
        </div>
        <span className="text-gray-200 font-medium text-sm">OpenCode</span>
        <span className="text-gray-500 text-xs">本地</span>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
                C
              </div>
              <h2 className="text-gray-200 text-xl font-semibold mb-2">你好，有什么可以帮你？</h2>
              <p className="text-gray-500 text-sm">通过本地 OpenCode 提供支持</p>
            </div>
          )}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
