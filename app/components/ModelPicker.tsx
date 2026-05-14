"use client";

import { useEffect, useRef, useState } from "react";

interface ModelItem {
  id: string;
  modelID: string;
  providerID: string;
  label: string;
}

interface ProviderGroup {
  providerID: string;
  name: string;
  models: ModelItem[];
}

const STORAGE_KEY = "selected_model_id";
const DEFAULT_MODEL = "ppio/pa/claude-sonnet-4-6";

export function useSelectedModel() {
  const [modelId, setModelId] = useState<string>(DEFAULT_MODEL);

  const select = (id: string) => {
    setModelId(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  return { modelId, select };
}

export default function ModelPicker() {
  const { modelId, select } = useSelectedModel();
  const [groups, setGroups] = useState<ProviderGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set(["Mify-Xiaomi", "Mify-Anthropic", "Mify-Vertex", "Mify-PPIO"]));
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || groups.length > 0) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/models");
        const d = (await r.json()) as { groups?: ProviderGroup[] };
        if (!cancelled && d.groups) setGroups(d.groups);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [open, groups.length]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const currentLabel = (() => {
    for (const g of groups) {
      const m = g.models.find((m) => m.id === modelId);
      if (m) return `${g.name} · ${m.label}`;
    }
    return modelId.split("/").pop() ?? modelId;
  })();

  const filteredGroups = search.trim()
    ? groups.map((g) => ({
        ...g,
        models: g.models.filter(
          (m) =>
            m.label.toLowerCase().includes(search.toLowerCase()) ||
            m.modelID.toLowerCase().includes(search.toLowerCase()) ||
            g.name.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((g) => g.models.length > 0)
    : groups;

  const toggleProvider = (pid: string) => {
    setExpandedProviders((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:border-gray-500 text-sm text-gray-300 hover:text-white transition-all max-w-56"
      >
        <span className="text-xs">🤖</span>
        <span className="truncate flex-1 text-left text-xs">{currentLabel}</span>
        <svg
          className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20" fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 z-50 flex flex-col max-h-[480px]">
          <div className="p-2 border-b border-gray-800">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索模型…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="overflow-y-auto flex-1 p-1">
            {loading && (
              <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
                <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2" />
                加载模型列表…
              </div>
            )}

            {!loading && filteredGroups.map((group) => {
              const isExpanded = search.trim() ? true : expandedProviders.has(group.providerID);
              return (
                <div key={group.providerID} className="mb-0.5">
                  <button
                    onClick={() => toggleProvider(group.providerID)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-800 text-left transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-400">{group.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-600">{group.models.length}</span>
                      <svg
                        className={`w-3 h-3 text-gray-600 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        viewBox="0 0 20 20" fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="pl-1">
                      {group.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { select(m.id); setOpen(false); setSearch(""); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                            m.id === modelId
                              ? "bg-blue-500/15 text-blue-300"
                              : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                          }`}
                        >
                          {m.id === modelId && (
                            <svg className="w-3 h-3 text-blue-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          {m.id !== modelId && <span className="w-3 shrink-0" />}
                          <span className="truncate">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && filteredGroups.length === 0 && search && (
              <div className="text-center py-6 text-gray-500 text-sm">未找到匹配的模型</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
