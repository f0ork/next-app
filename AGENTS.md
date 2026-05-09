<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md — next-app

> Next.js + TypeScript + Tailwind CSS Web 应用

## 技术栈
- 语言/运行时：TypeScript / Node.js
- 主要框架：Next.js 16 (App Router)
- 样式：Tailwind CSS v4
- 测试框架：（待配置）

## 命令
- 构建：`npm run build`
- 测试：`npm test`
- Lint：`npm run lint`
- 类型检查：`npx tsc --noEmit`
- 启动开发服务：`npm run dev`

## 代码结构
- 源码目录：`app/`
- 公共资源：`public/`
- 配置文件：`next.config.ts`、`tsconfig.json`、`eslint.config.mjs`

## 架构约定
- 使用 Next.js App Router（`app/` 目录）
- Server Components 优先，仅在需要交互时使用 Client Components
- 页面文件：`app/page.tsx`，布局：`app/layout.tsx`
- 组件放在 `app/components/` 下（待创建）
- 样式使用 Tailwind CSS utility classes

## 部署
- 目标：待确定
- 配置：`.env.local`（不提交到 Git）

## 项目级 Skill
- 项目专属 Skill 位于 `.opencode/skills/`
- 优先级高于全局 vibe-forge Skills

---
*vibe-forge 管理此项目 — 全局框架：~/vibe-forge/*
