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

## opencode-plugin-openspec 集成 — 完成

> 完成：2026-05-26 | Commit：82de2e7 | 部署：待配置

### 完成情况
- [x] 新增 `opencode-plugin-openspec` 插件配置（`.opencode/opencode.json`）✅
- [x] 添加 `opsx-propose/explore/apply/archive` 四个命令（`.opencode/commands/`）✅
- [x] 添加对应 OpenSpec Skills（`.opencode/skills/`）✅
- [x] 推送到 origin/main ✅

**状态**：✅ 已提交推送，部署待配置（`DEPLOY_TARGET` 未设置）

---

## 平台 v2 架构升级 — 进行中

> 规格：docs/specs/001-platform-v2/
> 决策：PostgreSQL + Drizzle ORM | NextAuth.js v5 | 单租户 | 独立 /admin

### Phase 1: 数据层 + 认证

- [ ] T001 安装依赖：drizzle-orm, drizzle-kit, @auth/drizzle-adapter, next-auth@beta, bcrypt, pg
- [ ] T002 创建 Drizzle Schema：users, agents, model_providers, usage_logs 四张表
- [ ] T003 配置 PostgreSQL 连接（lib/db/index.ts），开发环境用 Docker PG
- [ ] T004 创建种子脚本：默认管理员账号 + 6 个 Agent 初始配置 + Mify Provider
- [ ] T005 实现 NextAuth.js 认证：Credentials Provider + JWT + 角色注入
- [ ] T006 实现注册 API（POST /api/auth/register）：邮箱+密码+姓名
- [ ] T007 实现登录/登出页面（/login, /register）
- [ ] T008 实现 Next.js Middleware：保护 /agents/* 和 /admin/* 路由
- [ ] T009 验证：注册 → 登录 → 访问 /agents → 登出 流程通过

### Phase 2: Model Gateway

- [ ] T010 创建 lib/gateway/ 模块：Provider 抽象接口 + callModel() 核心函数
- [ ] T011 实现 Mify Provider（适配现有 @ai-sdk/anthropic 调用）
- [ ] T012 实现 OpenAI 兼容 Provider（支持任意 OpenAI API 兼容端点）
- [ ] T013 实现 Ollama Provider（支持本地部署模型）
- [ ] T014 实现 Token 用量自动记录（每次调用写入 usage_logs）
- [ ] T015 实现 Provider 管理：从 model_providers 表读取配置，动态创建 Provider 实例
- [ ] T016 迁移 lib/ai/client.ts 的 getModel() → 使用 Gateway
- [ ] T017 验证：Agent 调用走 Gateway，usage_logs 有记录

### Phase 3: Agent 管理

- [ ] T018 重构 Agent 注册表：从数据库读取 Agent 列表（替代硬编码）
- [ ] T019 实现 Agent 配置 API（GET/PATCH /api/admin/agents/:id）
- [ ] T020 重构 ModelPicker：从当前 Agent 配置读取可用模型（非全量列表）
- [ ] T021 迁移各 Agent 的 modelId 获取方式：从请求上下文读取 Agent 配置
- [ ] T022 验证：管理员禁用 Agent → 用户看不到 → 重新启用 → 可见

### Phase 4: Admin 后台

- [ ] T023 创建 /admin 布局（侧边栏导航 + 权限校验）
- [ ] T024 用户管理页面：列表、搜索、禁用/启用、角色修改
- [ ] T025 Agent 管理页面：启用/禁用开关、模型选择、Provider 选择
- [ ] T026 Provider 管理页面：增删改查、连接测试
- [ ] T027 用量统计页面：按 Agent/用户/时间维度的 Token 用量图表
- [ ] T028 验证：管理员可正常管理用户/Agent/Provider

### Phase 5: 数据隔离 + 部署

- [ ] T029 对话历史表添加 user_id 字段，API 查询时按用户过滤
- [ ] T030 知识库数据添加 user_id 字段，API 查询时按用户过滤
- [ ] T031 创建 Dockerfile（多阶段构建）
- [ ] T032 创建 docker-compose.yml（Next.js + PostgreSQL + 初始化脚本）
- [ ] T033 编写部署文档（README_DEPLOY.md）
- [ ] T034 验证：docker compose up → 访问 → 注册 → 使用 Agent

**状态**：🔴 Phase 1 未开始
**总任务数**：34
**预估总工时**：12-15 天

---
