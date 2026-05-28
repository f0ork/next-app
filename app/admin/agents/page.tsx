"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string;
  isEnabled: boolean;
  modelId: string;
  providerId: string;
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/agents")
      .then((r) => r.json())
      .then((data) => { setAgents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleEnabled = async (id: string, isEnabled: boolean) => {
    await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isEnabled: !isEnabled }),
    });
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, isEnabled: !isEnabled } : a)));
  };

  const updateModel = async (id: string, modelId: string) => {
    await fetch("/api/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, modelId }),
    });
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, modelId } : a)));
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Agent 管理</h1>
      <div className="grid gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
            <div className="text-2xl">{agent.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium">{agent.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs ${agent.isEnabled ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                  {agent.isEnabled ? "启用" : "禁用"}
                </span>
              </div>
              <p className="text-sm text-gray-500 truncate">{agent.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-600">模型：</span>
                <input
                  type="text"
                  value={agent.modelId}
                  onChange={(e) => updateModel(agent.id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 w-48"
                />
              </div>
            </div>
            <button
              onClick={() => toggleEnabled(agent.id, agent.isEnabled)}
              className={`px-3 py-1.5 rounded text-sm ${agent.isEnabled ? "bg-red-900/30 text-red-400 hover:bg-red-900/50" : "bg-green-900/30 text-green-400 hover:bg-green-900/50"}`}
            >
              {agent.isEnabled ? "禁用" : "启用"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
