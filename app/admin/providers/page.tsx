"use client";

import { useEffect, useState } from "react";

interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  isEnabled: boolean;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/providers")
      .then((r) => r.json())
      .then((data) => { setProviders(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleEnabled = async (id: string, isEnabled: boolean) => {
    await fetch("/api/admin/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isEnabled: !isEnabled }),
    });
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, isEnabled: !isEnabled } : p)));
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">模型 Provider 管理</h1>
      <div className="grid gap-4">
        {providers.map((provider) => (
          <div key={provider.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-medium">{provider.name}</h3>
                <p className="text-sm text-gray-500">{provider.type} · {provider.baseUrl}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${provider.isEnabled ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                  {provider.isEnabled ? "启用" : "禁用"}
                </span>
                <button
                  onClick={() => toggleEnabled(provider.id, provider.isEnabled)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  {provider.isEnabled ? "禁用" : "启用"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
