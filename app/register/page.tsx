"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "注册失败");
        setLoading(false);
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("注册失败，请重试");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">注册</h1>
          <p className="text-gray-400 mt-2">创建您的 AI Agent 平台账号</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900/60 border border-gray-800 rounded-2xl p-8 space-y-6">
          {error && (
            <div className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">姓名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="您的姓名"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="至少6位"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 transition-all"
          >
            {loading ? "注册中..." : "注册"}
          </button>

          <p className="text-center text-sm text-gray-500">
            已有账号？{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300">
              登录
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
