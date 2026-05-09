# ARCHITECTURE.md — next-app

> 架构决策记录（ADR）

## 系统概览

next-app 是一个基于 Next.js App Router 的现代 Web 应用，采用 TypeScript 确保类型安全，Tailwind CSS 提供快速样式开发能力。

## 技术栈

| 层次 | 技术 | 版本 | 选型原因 |
|------|------|------|---------|
| 框架 | Next.js | 16.x | App Router、SSR/SSG、零配置优化 |
| 语言 | TypeScript | 5.x | 类型安全、IDE 体验好 |
| 样式 | Tailwind CSS | 4.x | utility-first、无运行时开销 |
| 运行时 | Node.js | 18+ | Next.js 官方推荐 |

## 目录结构

```
next-app/
├── app/                    # App Router 页面和布局
│   ├── layout.tsx          # 根布局
│   ├── page.tsx            # 首页
│   ├── globals.css         # 全局样式
│   └── components/         # 共享组件（待创建）
├── public/                 # 静态资源
├── docs/
│   ├── tasks.md            # 任务 Backlog
│   └── specs/              # 功能规格文件夹
├── .opencode/
│   └── skills/             # 项目级 Skill 覆盖
├── AGENTS.md               # 项目上下文
└── ARCHITECTURE.md         # 本文件
```

## 核心模块

（待功能开发后补充）

## 变更记录

### 2026-05-09 — 项目初始化
- create-next-app 脚手架创建
- vibe-forge 框架初始化
