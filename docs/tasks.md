# 任务 Backlog — next-app

> 由 vibe-forge 管理，记录已完成工作和待办事项

---

## v0.1.0 — 多 Agent 平台基础 + 资讯收集 Agent（2026-05-09）✅

### 基础架构
- [x] Next.js + TypeScript + Tailwind CSS 项目初始化
- [x] vibe-forge 框架集成
- [x] opencode server 集成（HTTP API 封装）
- [x] 任务生命周期编排（orchestrator）
- [x] 文件持久化存储（data/tasks/）
- [x] SSE 实时事件流（浏览器 ↔ Next.js ↔ opencode）
- [x] Agent 注册机制（registry + AgentDefinition 接口）

### 资讯收集 Agent（research）
- [x] 表单驱动的需求收集（调研类型 / 主题 / 核心问题 / 约束）
- [x] AI 多轮引导补充信息（clarifying 阶段）
- [x] 自动判断信息充足性（READY_TO_EXECUTE）
- [x] 深度调研执行（executing 阶段，opencode 调用 librarian/web 工具）
- [x] 结构化报告生成（`<REPORT_JSON>` 解析 + schema 映射）
- [x] 报告页展示（摘要 + keyFindings + 章节 + 卡片 + 追问建议）
- [x] 4 种卡片类型：insight / comparison / risk / timeline
- [x] 追问功能（followup 阶段复用同一 session）

### 已知问题 / 技术债
- [ ] 前端任务页（/tasks/:id）需要加载历史消息重放（当前 SSE 只推增量）
- [ ] 错误状态 UI 需要完善（failed phase 的展示）
- [x] data/ 目录已加入 .gitignore ✅

---

## v0.3.0 — 模型选择 + 局域网访问（2026-05-09）✅

- [x] 基座模型切换为小米 mimo-v2.5-pro ✅
- [x] 模型选择器：支持 opencode 全量 412 个模型，按 provider 分组 ✅
- [x] localStorage 持久化模型选择 ✅
- [x] 监听 0.0.0.0，WSL 镜像网络模式，局域网直接访问 ✅ （`http://10.63.35.16:3001`）
- [x] ESLint 5 个错误全部修复 ✅
- [x] 生产构建通过 ✅

---

## Backlog（待规划）

### 平台能力
- [ ] Agent 选择页列出历史任务
- [ ] 任务列表 / 归档页
- [ ] 报告导出（PDF / Markdown）
- [ ] 多轮追问后报告版本化（v2 / v3）

### 新 Agent（待设计）
- [ ] 技术方案评审 Agent
- [ ] 需求拆解 Agent
- [ ] 代码审查 Agent

---
