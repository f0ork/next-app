"use client";

import Link from "next/link";
import ModelPicker from "@/app/components/ModelPicker";

const agents = [
  {
    id: "research",
    icon: "🔍",
    name: "资讯收集",
    description: "竞品分析、技术选型、通用调研",
    color: "from-blue-500 to-indigo-600",
    badge: "可用",
  },
  {
    id: "stock",
    icon: "📈",
    name: "股票分析",
    description: "输入股票名称，获取涨跌幅数据，支持数据问答",
    color: "from-green-500 to-emerald-600",
    badge: "可用",
  },
  {
    id: "idea",
    icon: "💡",
    name: "点子王",
    description: "输入关键词，AI 搜索网络找灵感，设计新 Agent",
    color: "from-yellow-500 to-orange-600",
    badge: "可用",
  },
  {
    id: "knowledge",
    icon: "📚",
    name: "知识库",
    description: "输入任何信息，AI 总结分类存储，支持对话问答",
    color: "from-purple-500 to-violet-600",
    badge: "可用",
  },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      <header className="border-b border-gray-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold">
            A
          </div>
          <span className="text-sm font-semibold text-white">AI Agent 平台</span>
        </div>
        <ModelPicker />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-5xl w-full space-y-12">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-white">选择能力</h1>
            <p className="text-gray-400 text-sm">选择一个 Agent 开始你的任务</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="group relative bg-gray-900/60 border border-gray-800 rounded-2xl p-6 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-black/30 hover:-translate-y-1"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl mb-4`}>
                  {agent.icon}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-base font-semibold text-white">{agent.name}</h2>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                    {agent.badge}
                  </span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{agent.description}</p>
                <div className="mt-4 text-xs text-gray-600 group-hover:text-gray-400 transition-colors">
                  点击开始 →
                </div>
              </Link>
            ))}

            <div className="bg-gray-900/30 border border-gray-800 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-xl bg-gray-800/50 flex items-center justify-center text-2xl mb-4 text-gray-600">
                ＋
              </div>
              <p className="text-xs text-gray-600">更多能力即将上线</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
