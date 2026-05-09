# ARCHITECTURE.md — next-app

> 架构决策记录（ADR）

## 系统概览

以 **opencode** 为 AI 执行引擎的多 Agent Web 平台。Next.js 作为中间编排层，浏览器提供各 Agent 专属的交互 UI，opencode 负责实际 AI 执行。

## 架构分层

```
浏览器 (专属 UI per Agent)
    ↕ SSE 实时事件 + REST
Next.js App Router (编排层)
    ├── Agent Registry       注册和管理所有 Agent
    ├── Task Orchestrator    任务生命周期编排
    ├── Task Store           文件持久化 + 内存缓存
    └── opencode Client      封装 opencode HTTP API
    ↕ HTTP API (session/message/event SSE)
opencode Server :4096 (AI 执行引擎)
    └── 使用本地配置的 AI 模型
```

## 技术栈

| 层次 | 技术 | 版本 | 选型原因 |
|------|------|------|---------|
| 框架 | Next.js | 16.x | App Router、SSR/SSG、API Routes |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 4.x | utility-first |
| AI 引擎 | opencode | 1.14.x | 本地 AI 执行、SSE 流式输出、session 管理 |
| 运行时 | Node.js | 18+ | 兼容 opencode |

## 目录结构

```
next-app/
├── app/
│   ├── agents/              # Agent 选择页 + 各 Agent 表单页
│   │   └── [agentId]/       # 动态路由，通用表单
│   ├── tasks/
│   │   └── [taskId]/
│   │       ├── page.tsx     # 任务对话引导页（实时流式）
│   │       └── report/      # 结构化报告展示页
│   ├── api/
│   │   ├── agents/          # GET /api/agents
│   │   │   └── [agentId]/tasks/  # POST 创建任务
│   │   └── tasks/[taskId]/
│   │       ├── route.ts     # GET 任务详情
│   │       ├── messages/    # GET/POST 消息
│   │       ├── stream/      # GET SSE 实时事件流
│   │       └── report/      # GET 结构化报告
│   └── hooks/
│       └── useTaskStream.ts # 订阅任务 SSE 的 React Hook
├── lib/
│   ├── agents/
│   │   ├── registry.ts      # Agent 注册中心
│   │   └── research.ts      # 资讯收集 Agent 定义
│   ├── opencode/
│   │   └── client.ts        # opencode HTTP API 封装
│   ├── store/
│   │   └── index.ts         # 文件持久化 + 内存缓存
│   └── orchestrator.ts      # 任务生命周期核心编排
├── types/
│   └── index.ts             # 全量 TypeScript 类型定义
├── data/
│   └── tasks/               # 任务持久化目录（gitignore）
└── docs/
    ├── tasks.md             # 任务 Backlog
    └── specs/               # 功能规格
```

## 核心数据流

### 任务创建
```
用户填写表单
→ POST /api/agents/research/tasks
→ createTask()：创建 opencode session，立即返回 taskId
→ 后台 void startTask()：先建立 /event SSE，再 sendMessage
→ AI 开始响应，delta 事件实时推送给所有订阅者
```

### 任务阶段流转
```
clarifying  → AI 评估信息是否充分，可能提问
    ↓ (AI 输出 READY_TO_EXECUTE)
executing   → 触发执行分析
    ↓
reporting   → 生成结构化报告（含 <REPORT_JSON> block）
    ↓ (Next.js 解析 JSON，校验，落盘)
followup    → 用户可继续追问，报告页可用
```

### SSE 事件类型
| 事件 | 触发时机 |
|------|---------|
| `task.phase.changed` | 任务阶段切换 |
| `assistant.message.delta` | AI 流式输出增量 |
| `assistant.question.generated` | AI 提出补充问题 |
| `report.finalized` | 报告解析成功落盘 |
| `task.error` | 任务出错 |

## Agent 扩展机制

新增 Agent 三步：
1. 在 `lib/agents/` 下创建 `xxx.ts`，实现 `AgentDefinition` 接口
2. 在 `lib/agents/registry.ts` 注册
3. 前端 `app/agents/page.tsx` 的静态列表添加入口

Agent 配置驱动 prompt、输入表单、输出 schema，核心编排代码无需改动。

## ADR — 关键决策

### ADR-001: opencode serve 模式而非 CLI spawn
- **决策**：使用 `opencode serve` 长期运行 HTTP server，Next.js 通过 HTTP API 通信
- **原因**：CLI spawn 每次需要冷启动（5-8s），无法复用 session 上下文；serve 模式支持多会话并发
- **权衡**：需要手动启动 opencode server

### ADR-002: SSE 而非 WebSocket
- **决策**：浏览器↔Next.js 用 SSE，Next.js↔opencode 也用 SSE
- **原因**：单向推送场景，SSE 实现更简单；opencode 本身就是 SSE 输出

### ADR-003: 文件系统持久化而非数据库
- **决策**：`data/tasks/` 目录，每个任务一个子目录，JSON/JSONL 文件
- **原因**：无数据库依赖，开发简单；任务数量少，文件系统足够
- **升级路径**：接口层不变，内部存储可平滑迁移到 SQLite

### ADR-004: 先建 event stream 再发消息
- **决策**：`startTask()` 先 `fetch('/event')`，再 `sendMessage()`
- **原因**：opencode 的 `/message` 是同步等待 AI 完成才返回；若先发消息，AI 响应快时 `session.idle` 事件会在 stream 建立前发出，导致错过

## 变更记录

### 2026-05-09 — 项目初始化
- create-next-app 脚手架创建，vibe-forge 框架初始化

### 2026-05-09 — v0.1.0 资讯收集 Agent
- 搭建多 Agent 平台基础架构
- 实现资讯收集 Agent（竞品分析/技术选型/通用调研）
- AI 多轮引导式需求收集
- 结构化报告展示（摘要 + 章节 + 4 种卡片类型）
- 任务全生命周期管理（任务创建/阶段流转/持久化/追问）
