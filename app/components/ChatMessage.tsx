"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import type { Components } from "react-markdown";
import type { CSSProperties } from "react";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  isStreaming?: boolean;
};

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const isInline = !match;
    if (isInline) {
      return (
        <code
          className="bg-gray-700 text-violet-300 px-1 py-0.5 rounded text-sm font-mono"
          {...props}
        >
          {children}
        </code>
      );
    }
    return (
      <SyntaxHighlighter
        style={oneDark as { [key: string]: CSSProperties }}
        language={match[1]}
        PreTag="div"
        className="rounded-lg my-2 text-sm"
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    );
  },
  p({ children }) {
    return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
  },
  ol({ children }) {
    return (
      <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-violet-500 pl-3 italic text-gray-400 my-2">
        {children}
      </blockquote>
    );
  },
  h1({ children }) {
    return <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-lg font-semibold mb-2 mt-3">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-base font-semibold mb-1 mt-2">{children}</h3>;
  },
};

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 mr-2 mt-1">
          AI
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        {message.images && message.images.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-end">
            {message.images.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-600">
                <Image src={src} alt={`附图 ${i + 1}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        )}

        {message.content && (
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              isUser
                ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white rounded-tr-sm"
                : "bg-gray-800 text-gray-100 rounded-tl-sm"
            }`}
          >
            {isUser ? (
              <span className="whitespace-pre-wrap">{message.content}</span>
            ) : (
              <ReactMarkdown components={markdownComponents}>
                {message.content}
              </ReactMarkdown>
            )}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}

        {message.isStreaming && !message.content && (
          <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold shrink-0 ml-2 mt-1">
          你
        </div>
      )}
    </div>
  );
}
