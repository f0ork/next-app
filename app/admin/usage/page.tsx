"use client";

import { useEffect, useState } from "react";

interface UsageData {
  byAgent: Array<{ agentId: string; totalTokens: number; count: number }>;
  byUser: Array<{ userId: string; totalTokens: number; count: number }>;
  total: { totalTokens: number; count: number };
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/usage")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">加载中...</div>;
  if (!data) return <div className="text-gray-500">无数据</div>;

  const total = data.total ?? { totalTokens: 0, count: 0 };
  const byAgent = data.byAgent ?? [];
  const byUser = data.byUser ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">用量统计</h1>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-500">总调用次数</div>
          <div className="text-2xl font-bold text-white">{total.count}</div>
        </div>
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
          <div className="text-sm text-gray-500">总 Token 用量</div>
          <div className="text-2xl font-bold text-white">{(total.totalTokens ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-gray-300 mb-3">按 Agent 统计</h3>
        {byAgent.length === 0 ? (
          <p className="text-sm text-gray-600">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {byAgent.map((item) => (
              <div key={item.agentId} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{item.agentId}</span>
                <span className="text-gray-500">{(item.totalTokens ?? 0).toLocaleString()} tokens ({item.count ?? 0} 次)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
