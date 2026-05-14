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
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a] text-gray-100 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">选择能力</h1>
            <p className="text-gray-400">选择一个 Agent 开始你的任务</p>
          </div>
          <div className="shrink-0 pt-1">
            <ModelPicker />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${agent.id}`}
              className="group relative bg-gray-900 border border-gray-700 rounded-2xl p-6 hover:border-gray-500 transition-all hover:shadow-lg hover:shadow-black/30"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl mb-4`}>
                {agent.icon}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white">{agent.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                  {agent.badge}
                </span>
              </div>
              <p className="text-sm text-gray-400">{agent.description}</p>
              <div className="mt-4 text-xs text-gray-500 group-hover:text-gray-400 transition-colors">
                点击开始 →
              </div>
            </Link>
          ))}

          <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl mb-4">
              ＋
            </div>
            <p className="text-sm text-gray-500">更多能力即将上线</p>
          </div>
        </div>
      </div>
    </div>
  );
}
