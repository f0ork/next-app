"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: !isActive }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !isActive } : u)));
  };

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, role: newRole }),
    });
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role: newRole } : u)));
  };

  if (loading) return <div className="text-gray-500">加载中...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">用户管理</h1>
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              <th className="text-left px-4 py-3">姓名</th>
              <th className="text-left px-4 py-3">邮箱</th>
              <th className="text-left px-4 py-3">角色</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-gray-800/50">
                <td className="px-4 py-3 text-gray-200">{user.name}</td>
                <td className="px-4 py-3 text-gray-400">{user.email}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleRole(user.id, user.role)}
                    className={`px-2 py-0.5 rounded text-xs ${
                      user.role === "admin" ? "bg-blue-900/50 text-blue-400" : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {user.role}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${user.isActive ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"}`}>
                    {user.isActive ? "启用" : "禁用"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(user.id, user.isActive)}
                    className="text-xs text-gray-400 hover:text-gray-200"
                  >
                    {user.isActive ? "禁用" : "启用"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
