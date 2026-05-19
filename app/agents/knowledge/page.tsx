"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Tab = "browse" | "add" | "chat" | "manage";

interface KBEntry {
  id: string;
  title: string;
  content?: string;
  summary: string;
  category: string;
  tags: string[];
  sourceType: string;
  createdAt: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ id: string; title: string; category: string }>;
}

const NAV_ITEMS = [
  { key: "browse" as Tab, icon: "📖", label: "浏览", desc: "查看知识库" },
  { key: "add" as Tab, icon: "＋", label: "录入", desc: "添加新知识" },
  { key: "chat" as Tab, icon: "💬", label: "问答", desc: "AI 知识问答" },
  { key: "manage" as Tab, icon: "⚙", label: "管理", desc: "导入导出" },
];

export default function KnowledgeAgentPage() {
  const [tab, setTab] = useState<Tab>("browse");
  const [inputContent, setInputContent] = useState("");
  const [inputType, setInputType] = useState<"text" | "url" | "image" | "file">("text");
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [stats, setStats] = useState({ totalEntries: 0, categories: 0, lastUpdated: null as string | null });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadEntries();
    void loadStats();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const loadEntries = async () => {
    const res = await fetch("/api/agents/knowledge/list?limit=200");
    const data = (await res.json()) as { entries: KBEntry[] };
    setEntries(data.entries ?? []);
  };

  const loadStats = async () => {
    const res = await fetch("/api/agents/knowledge/list?action=stats");
    const data = (await res.json()) as { stats: typeof stats };
    if (data.stats) setStats(data.stats);
  };

  const handleIngest = async () => {
    if (ingesting) return;
    if (inputType === "image" || inputType === "file") {
      if (!pendingFile) return;
    } else {
      if (!inputContent.trim()) return;
    }
    setIngesting(true);
    setIngestResult(null);
    try {
      const formData = new FormData();
      formData.append("inputType", inputType);
      if (pendingFile && (inputType === "image" || inputType === "file")) {
        formData.append("file", pendingFile);
      } else {
        formData.append("content", inputContent.trim());
      }
      const res = await fetch("/api/agents/knowledge/ingest", { method: "POST", body: formData });
      const data = (await res.json()) as { ok?: boolean; title?: string; category?: string; tags?: string[]; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? "录入失败");
      setIngestResult(`已录入：${data.title}（${data.category}）标签：${data.tags?.join("、")}`);
      setInputContent("");
      setPendingFile(null);
      void loadEntries();
      void loadStats();
    } catch (err) {
      setIngestResult(`❌ ${err instanceof Error ? err.message : "录入失败"}`);
    } finally {
      setIngesting(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const question = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: question }]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/agents/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = (await res.json()) as { answer?: string; sources?: Array<{ id: string; title: string; category: string }>; error?: string };
      if (!res.ok || !data.answer) throw new Error(data.error ?? "查询失败");
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer!, sources: data.sources }]);
    } catch (err) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err instanceof Error ? err.message : "查询失败"}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExport = async () => {
    const res = await fetch("/api/agents/knowledge/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const data = JSON.parse(text) as { entries: KBEntry[] };
      const res = await fetch("/api/agents/knowledge/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: data.entries }),
      });
      const result = (await res.json()) as { ok?: boolean; imported?: number; error?: string };
      alert(result.ok ? `导入 ${result.imported} 条记录` : `失败：${result.error}`);
      void loadEntries();
      void loadStats();
    } catch {
      alert("文件格式错误");
    }
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/agents/knowledge/list", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    void loadStats();
  };

  const filteredEntries = entries
    .filter((e) => !filterCategory || e.category === filterCategory)
    .filter((e) =>
      !searchQuery ||
      e.title.includes(searchQuery) ||
      e.summary.includes(searchQuery) ||
      e.tags.some((t) => t.includes(searchQuery))
    );

  const categories = Array.from(new Set(entries.map((e) => e.category)));

  return (
    <div className="h-screen bg-[#0a0a14] text-gray-100 flex overflow-hidden">
      <nav className="w-56 shrink-0 bg-[#080810] border-r border-gray-800 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-800 flex items-center gap-2">
          <Link href="/agents" className="text-gray-500 hover:text-gray-300 text-sm">←</Link>
          <div className="w-px h-4 bg-gray-800" />
          <span className="text-lg">📚</span>
          <span className="text-sm font-semibold text-white">知识库</span>
        </div>

        <div className="flex-1 py-2 space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                tab === item.key
                  ? "bg-purple-600/15 text-purple-300 border border-purple-600/30"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              }`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                <div className="text-xs text-gray-600">{item.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-gray-800 text-xs text-gray-600">
          {stats.totalEntries} 条知识 · {stats.categories} 个分类
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-4xl mx-auto">

          {tab === "browse" && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">总条目</span>
                  <span className="text-2xl font-bold text-white">{entries.length}</span>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">分类</span>
                  <span className="text-2xl font-bold text-white">{categories.length}</span>
                </div>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <span className="text-xs text-gray-500 block mb-1">标签</span>
                  <span className="text-2xl font-bold text-white">{new Set(entries.flatMap((e) => e.tags)).size}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="搜索知识库…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="">全部分类</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {entries.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-5xl mb-4">📚</div>
                  <h2 className="text-lg font-semibold text-white mb-2">知识库为空</h2>
                  <p className="text-gray-500 text-sm mb-6">录入文字、链接、图片或文件，AI 自动总结分类</p>
                  <button
                    onClick={() => setTab("add")}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white text-sm font-medium hover:from-purple-500 hover:to-violet-500 transition-all"
                  >
                    开始录入
                  </button>
                </div>
              )}

              {entries.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="group bg-gray-900/60 border border-gray-800 rounded-xl p-4 hover:border-purple-600/40 transition-all">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${
                            entry.sourceType === "url" ? "bg-blue-900/30 text-blue-400 border border-blue-800/50" :
                            entry.sourceType === "image" ? "bg-pink-900/30 text-pink-400 border border-pink-800/50" :
                            entry.sourceType === "file" ? "bg-green-900/30 text-green-400 border border-green-800/50" :
                            "bg-purple-900/30 text-purple-400 border border-purple-800/50"
                          }`}>
                            {entry.sourceType === "url" ? "🔗" : entry.sourceType === "image" ? "🖼" : entry.sourceType === "file" ? "📄" : "📝"}
                          </span>
                          <h3 className="text-sm font-medium text-white truncate">{entry.title}</h3>
                        </div>
                        <button
                          onClick={() => void handleDelete(entry.id)}
                          className="shrink-0 ml-2 text-xs text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{entry.summary || entry.content?.slice(0, 100) || ""}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{entry.category}</span>
                          {entry.tags.slice(0, 2).map((tag, i) => (
                            <span key={i} className="text-xs px-2 py-0.5 rounded bg-gray-800/50 text-gray-500">{tag}</span>
                          ))}
                        </div>
                        <span className="text-xs text-gray-600 shrink-0">{entry.createdAt.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {entries.length > 0 && filteredEntries.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-6">无匹配结果</p>
              )}
            </div>
          )}

          {tab === "add" && (
            <div className="space-y-5">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-semibold text-white">录入知识</h2>
                <p className="text-gray-500 text-sm">粘贴文字、输入链接，AI 自动总结分类</p>
              </div>

              <div className="flex gap-2 flex-wrap">
                {([
                  { key: "text" as const, label: "📝 文字" },
                  { key: "url" as const, label: "🔗 链接" },
                  { key: "image" as const, label: "🖼 图片" },
                  { key: "file" as const, label: "📄 文件" },
                ]).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => { setInputType(t.key); setPendingFile(null); setInputContent(""); }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      inputType === t.key
                        ? "bg-purple-600/20 text-purple-400 border border-purple-600/40"
                        : "text-gray-500 hover:text-gray-300 border border-gray-800"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {(inputType === "image" || inputType === "file") ? (
                <div
                  className="w-full border-2 border-dashed border-gray-700 rounded-xl px-6 py-8 text-center cursor-pointer hover:border-purple-500 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) setPendingFile(file);
                  }}
                >
                  {pendingFile ? (
                    <div className="space-y-2">
                      {inputType === "image" && pendingFile.type.startsWith("image/") && (
                        <div className="w-20 h-20 mx-auto rounded-lg overflow-hidden border border-gray-700">
                          <img src={URL.createObjectURL(pendingFile)} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <p className="text-sm text-gray-300">{pendingFile.name}</p>
                      <p className="text-xs text-gray-500">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPendingFile(null); }}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        移除
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-3xl text-gray-600">{inputType === "image" ? "🖼" : "📄"}</div>
                      <p className="text-sm text-gray-400">
                        {inputType === "image" ? "拖拽或点击上传图片" : "拖拽或点击上传文件"}
                      </p>
                      <p className="text-xs text-gray-600">
                        {inputType === "image" ? "PNG, JPG, WebP" : "TXT, MD, JSON, CSV 等文本文件"}
                      </p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={inputType === "image" ? "image/*" : ".txt,.md,.json,.csv,.log,.xml,.yaml,.yml,.html,.css,.js,.ts"}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingFile(file);
                    }}
                    className="hidden"
                  />
                </div>
              ) : (
                <textarea
                  value={inputContent}
                  onChange={(e) => setInputContent(e.target.value)}
                  placeholder={inputType === "url" ? "https://example.com/article" : "粘贴任何文字内容…"}
                  rows={6}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              )}

              <button
                onClick={() => void handleIngest()}
                disabled={ingesting || ((inputType === "image" || inputType === "file") ? !pendingFile : !inputContent.trim())}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white font-medium text-sm hover:from-purple-500 hover:to-violet-500 disabled:opacity-40 transition-all"
              >
                {ingesting ? "AI 正在总结分类…" : "录入知识库"}
              </button>

              {ingestResult && (
                <div className="text-sm text-gray-300 bg-gray-900/60 border border-gray-800 rounded-xl px-4 py-3">
                  {ingestResult}
                </div>
              )}
            </div>
          )}

          {tab === "chat" && (
            <div className="flex flex-col h-[calc(100vh-48px)]">
              <div className="flex-1 overflow-y-auto space-y-3 pb-4">
                {chatMessages.length === 0 && (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center space-y-2">
                      <div className="text-4xl mb-2">💬</div>
                      <p className="text-gray-400 text-sm">向知识库提问，AI 基于已有内容回答</p>
                    </div>
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-xl text-sm ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-tr-sm"
                        : "bg-gray-800 text-gray-200 rounded-tl-sm"
                    }`}>
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700 flex flex-wrap gap-1">
                          {msg.sources.map((s, j) => (
                            <span key={j} className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{s.title}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-800 px-4 py-2.5 rounded-xl rounded-tl-sm flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="shrink-0 flex gap-2 pt-2 border-t border-gray-800">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleChat(); }}
                  placeholder="向知识库提问…"
                  disabled={chatLoading}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={() => void handleChat()}
                  disabled={!chatInput.trim() || chatLoading}
                  className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
                >
                  提问
                </button>
              </div>
            </div>
          )}

          {tab === "manage" && (
            <div className="space-y-6">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-300 mb-4">知识库统计</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">总条目</span>
                    <span className="text-2xl font-bold text-white">{stats.totalEntries}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">分类数</span>
                    <span className="text-2xl font-bold text-white">{stats.categories}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">最后更新</span>
                    <span className="text-sm text-gray-400">{stats.lastUpdated?.slice(0, 10) ?? "无"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => void handleExport()}
                  className="py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-purple-500 hover:text-purple-400 text-sm transition-colors"
                >
                  📥 导出知识库
                </button>
                <label className="py-3 rounded-xl border border-gray-700 text-gray-300 hover:border-purple-500 hover:text-purple-400 text-sm transition-colors cursor-pointer text-center">
                  📤 导入知识库
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => void handleImport(e)}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
