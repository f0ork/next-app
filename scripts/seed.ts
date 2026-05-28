import { db, schema } from "../lib/db";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

const now = new Date();

async function seed() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 10);
  db.insert(schema.users).values({
    id: randomUUID(),
    email: "admin@platform.local",
    password: adminPassword,
    name: "管理员",
    role: "admin",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing().run();
  console.log("  ✓ Admin user: admin@platform.local / admin123");

  const agents = [
    { id: "research", name: "资讯收集", description: "竞品分析、技术选型、通用调研", icon: "🔍", color: "from-blue-500 to-indigo-600" },
    { id: "stock", name: "股票分析", description: "输入股票名称，获取涨跌幅数据，支持数据问答", icon: "📈", color: "from-green-500 to-emerald-600" },
    { id: "idea", name: "点子王", description: "输入关键词，AI 搜索网络找灵感，设计新 Agent", icon: "💡", color: "from-yellow-500 to-orange-600" },
    { id: "knowledge", name: "知识库", description: "输入任何信息，AI 总结分类存储，支持对话问答", icon: "📚", color: "from-purple-500 to-violet-600" },
    { id: "mcu", name: "MCU手册速读", description: "上传MCU数据手册，AI快速提炼关键设计要点", icon: "⚡", color: "from-cyan-500 to-teal-600" },
    { id: "maas", name: "MaaS选型助手", description: "输入业务需求，AI自动对比主流MaaS平台，生成选型报告", icon: "🧠", color: "from-teal-500 to-emerald-600" },
  ];

  for (const agent of agents) {
    db.insert(schema.agents).values({
      ...agent,
      isEnabled: true,
      modelId: "xiaomi/mimo-v2.5-pro",
      providerId: "litellm",
      config: "{}",
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing().run();
  }
  console.log(`  ✓ ${agents.length} agents created`);

  db.insert(schema.modelProviders).values({
    id: "litellm",
    name: "LiteLLM Gateway",
    type: "openai",
    baseUrl: "http://localhost:4000/v1",
    apiKey: "sk-litellm-master-key-change-me",
    isEnabled: true,
    config: "{}",
    createdAt: now,
  }).onConflictDoNothing().run();
  console.log("  ✓ LiteLLM provider created");

  db.insert(schema.modelProviders).values({
    id: "mify",
    name: "Mify (小米AI)",
    type: "anthropic",
    baseUrl: "https://api.llm.mioffice.cn/anthropic/v1",
    apiKey: process.env.MIFY_API_KEY ?? "",
    isEnabled: true,
    config: "{}",
    createdAt: now,
  }).onConflictDoNothing().run();
  console.log("  ✓ Mify provider created");

  console.log("Seeding complete!");
}

seed().catch(console.error);
