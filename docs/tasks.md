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
- [x] 深度调研执行（executing 阶段，AI 调用 web search + fetch_page）
- [x] 结构化报告生成（REPORT_JSON 解析 + schema 映射）
- [x] 报告页展示（摘要 + keyFindings + 章节 + 卡片 + 追问建议）
- [x] 4 种卡片类型：insight / comparison / risk / timeline
- [x] 追问功能（followup 阶段复用同一 session）

---

## v0.2.0 — 零对话交互模式 + Playwright 搜索（2026-05-09）✅

- [x] 重构交互：用户只输入一句话 + 点选卡片，全程零文字输入
- [x] AI 分析需求维度 + 返回结构化选项（analyze API）
- [x] 任务执行页：全屏等待 + 底部 AI 输出小窗
- [x] 替换 opencode 为 Vercel AI SDK 直连（Anthropic API）
- [x] DuckDuckGo 搜索被封，替换为 Playwright + Bing 本地浏览器搜索
- [x] JSON 解析修复（未转义中文引号）

---

## v0.3.0 — 模型选择器 + 局域网访问（2026-05-09）✅

- [x] 模型选择器：支持全量模型，按 provider 分组，localStorage 持久化
- [x] 默认模型：xiaomi/mimo-v2.5-pro
- [x] WSL 镜像网络模式，局域网 10.63.35.16 直接访问
- [x] ESLint 全绿

---

## v0.4.0 — 股票分析 Agent（2026-05-14）✅

### 股票数据服务
- [x] 腾讯股票 API：搜索 + 历史涨跌幅
- [x] 美股代码格式修复（加 .OQ 后缀）
- [x] 指数自动映射 ETF（纳斯达克100 → QQQ）

### 股票 Agent 功能
- [x] 输入股票名 → 自动搜索匹配 → 选择时间范围
- [x] 每日涨跌幅数据展示
- [x] AI 数据问答（流式输出）
- [x] 模拟盘引擎：自定义买入/卖出规则，T+1 交易
- [x] 4 种预设策略 + 自定义配置
- [x] Tab 切换：数据表格 / 模拟盘 / 数据问答

### 模拟盘特性
- [x] 规则：买入条件（跌 X%）、卖出条件（涨 X%）、交易比例
- [x] T+1 交易：今天数据决定明天买卖
- [x] 触发精度：0.1%（支持任意小数）
- [x] 输出：收益率、交易次数、最大回撤、交易明细

---

## Backlog（待规划）

### 平台能力
- [ ] Agent 选择页列出历史任务
- [ ] 任务列表 / 归档页
- [ ] 报告导出（PDF / Markdown）

### 新 Agent（待设计）
- [ ] 技术方案评审 Agent
- [ ] 需求拆解 Agent
- [ ] 代码审查 Agent

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
