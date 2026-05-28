"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/admin/users", label: "用户管理", icon: "👥" },
  { href: "/admin/agents", label: "Agent 管理", icon: "🤖" },
  { href: "/admin/providers", label: "模型配置", icon: "⚙️" },
  { href: "/admin/usage", label: "用量统计", icon: "📊" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">请先登录</p>
          <Link href="/login" className="text-blue-400 hover:text-blue-300">前往登录</Link>
        </div>
      </div>
    );
  }

  if ((session.user as { role?: string })?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">需要管理员权限</p>
          <Link href="/agents" className="text-blue-400 hover:text-blue-300">返回首页</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100 flex">
      <aside className="w-64 bg-gray-900/80 border-r border-gray-800 p-4 space-y-2">
        <Link href="/agents" className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-200 text-sm mb-4">
          ← 返回平台
        </Link>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">管理后台</h2>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname === item.href
                ? "bg-blue-600/20 text-blue-400"
                : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
            }`}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
