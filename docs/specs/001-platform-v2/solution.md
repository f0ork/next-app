# 方案：AI Agent 平台 v2 架构升级

> 需求文档：[requirements.md](./requirements.md)

## 技术选型

| 选项 | 选择 | 原因 |
|------|------|------|
| **认证** | NextAuth.js v5 + JWT | 与 Next.js 深度集成，支持 Credentials Provider |
| **数据库** | PostgreSQL + Drizzle ORM | 类型安全，迁移方便，比 Prisma 更轻量 |
| **密码加密** | bcrypt | 业界标准，Node.js 原生支持 |
| **后台框架** | 内建页面（不用第三方后台） | 需求简单，避免引入 AdminJS 等重型框架 |
| **模型网关** | LiteLLM Proxy | 开源、100+ LLM 支持、自带 Admin UI、Token 追踪、负载均衡 |
| **部署** | Docker Compose | 一键部署 Next.js + PostgreSQL |

## 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (单体)                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ /login   │  │ /agents  │  │ /admin   │  ← 页面层     │
│  │ /register│  │ /agents/*│  │ /admin/* │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │                      │
│  ┌────┴─────────────┴─────────────┴─────┐               │
│  │           Middleware (认证/权限)        │               │
│  └────┬─────────────┬─────────────┬─────┘               │
│       │             │             │                      │
│  ┌────┴─────┐  ┌────┴─────┐  ┌───┴──────┐              │
│  │ Auth API │  │Agent API │  │ Admin API│  ← API 层    │
│  └────┬─────┘  └────┬─────┘  └───┬──────┘              │
│       │             │             │                      │
│  ┌────┴─────────────┴─────────────┴─────┐               │
│  │          Model Gateway (核心)          │               │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐│               │
│  │  │  Mify   │ │  Local  │ │ OpenAI  ││  ← Provider  │
│  │  │Provider │ │Provider │ │Compat.  ││               │
│  │  └─────────┘ └─────────┘ └─────────┘│               │
│  │      ↕ Token Usage Recorder          │               │
│  └──────────────────┬───────────────────┘               │
│                     │                                    │
│  ┌──────────────────┴───────────────────┐               │
│  │          PostgreSQL (Drizzle)          │               │
│  │  users | agents | models | usage_logs │               │
│  └──────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────┘
```

## 数据模型

### users 表
```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt hash
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(20) DEFAULT 'user',   -- 'admin' | 'user'
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now()
);
```

### agents 表
```sql
CREATE TABLE agents (
  id            VARCHAR(50) PRIMARY KEY,     -- 'research', 'stock', etc.
  name          VARCHAR(100) NOT NULL,
  description   TEXT,
  icon          VARCHAR(10),
  color         VARCHAR(50),
  is_enabled    BOOLEAN DEFAULT true,
  model_id      VARCHAR(100),                -- 默认模型 ID
  provider_id   VARCHAR(50),                 -- 默认 Provider
  config        JSONB DEFAULT '{}',          -- Agent 特有配置
  created_at    TIMESTAMP DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now()
);
```

### model_providers 表
```sql
CREATE TABLE model_providers (
  id          VARCHAR(50) PRIMARY KEY,       -- 'mify', 'local', 'openai'
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL,          -- 'anthropic' | 'openai' | 'ollama'
  base_url    VARCHAR(500) NOT NULL,
  api_key     VARCHAR(500),                  -- 加密存储
  is_enabled  BOOLEAN DEFAULT true,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMP DEFAULT now()
);
```

### usage_logs 表
```sql
CREATE TABLE usage_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  agent_id      VARCHAR(50) REFERENCES agents(id),
  provider_id   VARCHAR(50),
  model_id      VARCHAR(100),
  input_tokens  INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens  INTEGER DEFAULT 0,
  duration_ms   INTEGER,
  created_at    TIMESTAMP DEFAULT now()
);

-- 索引：按时间、用户、Agent 查询用量
CREATE INDEX idx_usage_logs_created ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_agent ON usage_logs(agent_id);
```

## 核心模块设计

### 1. Model Gateway (`lib/gateway/`)

```typescript
// lib/gateway/index.ts
export interface ModelProvider {
  id: string;
  name: string;
  type: 'anthropic' | 'openai' | 'ollama';
  getModel(modelId: string): LanguageModel;
}

export interface GatewayOptions {
  providerId?: string;   // 默认 'mify'
  modelId?: string;      // 默认 'xiaomi/mimo-v2.5-pro'
  userId?: string;       // 用于用量记录
  agentId?: string;      // 用于用量记录
}

// 核心函数：所有 Agent 通过此函数调用模型
export async function callModel(options: GatewayOptions): Promise<LanguageModel> {
  const provider = await getProvider(options.providerId);
  const model = provider.getModel(options.modelId);
  
  // 包装模型，自动记录 Token 用量
  return wrapWithUsageTracking(model, options);
}
```

### 2. Auth 中间件 (`lib/auth/`)

```typescript
// lib/auth/index.ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize({ email, password }) {
        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });
        if (!user || !await bcrypt.compare(password, user.password)) {
          return null;
        }
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    },
  },
});
```

### 3. Agent 注册表改造 (`lib/agents/registry.ts`)

当前 Agent 配置硬编码在 `page.tsx` 中。改为从数据库读取：

```typescript
// lib/agents/registry.ts
export async function getEnabledAgents(userId: string): Promise<AgentConfig[]> {
  const agents = await db.query.agents.findMany({
    where: eq(agents.isEnabled, true),
  });
  return agents;
}

export async function getAgentConfig(agentId: string): Promise<AgentConfig> {
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
  });
  if (!agent) throw new Error(`Agent ${agentId} not found`);
  return agent;
}
```

## API 设计

### Auth API
| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录（NextAuth） |
| POST | `/api/auth/logout` | 登出 |
| GET  | `/api/auth/session` | 获取当前会话 |

### Agent API（需认证）
| 方法 | 路径 | 描述 |
|------|------|------|
| GET  | `/api/agents` | 获取可用 Agent 列表 |
| POST | `/api/agents/:id/chat` | 与 Agent 对话 |

### Admin API（需 admin 角色）
| 方法 | 路径 | 描述 |
|------|------|------|
| GET  | `/api/admin/users` | 用户列表 |
| PATCH | `/api/admin/users/:id` | 更新用户状态 |
| GET  | `/api/admin/agents` | Agent 列表（含配置） |
| PATCH | `/api/admin/agents/:id` | 更新 Agent 配置 |
| GET  | `/api/admin/providers` | Provider 列表 |
| POST | `/api/admin/providers` | 添加 Provider |
| PATCH | `/api/admin/providers/:id` | 更新 Provider |
| GET  | `/api/admin/usage` | 用量统计 |

## 实现步骤（分阶段）

### Phase 1：数据层 + Auth（约 3-4 天）
1. 安装 PostgreSQL + Drizzle ORM
2. 创建数据库 schema（users, agents, providers, usage_logs）
3. 实现用户注册/登录 API
4. 实现 JWT 认证中间件
5. 添加种子数据（默认管理员 + 初始 Agent 配置）

### Phase 2：Model Gateway（约 2-3 天）
1. 重构 `lib/ai/client.ts` → `lib/gateway/`
2. 实现 Provider 抽象层（Mify / OpenAI 兼容 / Ollama）
3. 实现 Token 用量自动记录
4. 迁移所有 Agent 使用 Gateway

### Phase 3：Agent 管理（约 2-3 天）
1. Agent 列表从数据库读取（替代硬编码）
2. 实现 Agent 启用/禁用 API
3. 实现 Agent 模型配置 API
4. 前端适配（ModelPicker 改为从 Agent 配置读取）

### Phase 4：Admin 后台（约 3-4 天）
1. 创建 `/admin` 布局和路由
2. 用户管理页面
3. Agent 管理页面
4. Provider 管理页面
5. 用量统计仪表盘

### Phase 5：数据隔离 + 部署（约 2 天）
1. 对话历史按用户隔离
2. 知识库按用户隔离
3. Docker Compose 部署配置
4. 部署文档

## 与现有代码的影响

### 需要修改的文件
- `lib/ai/client.ts` → 重构为 Gateway
- `app/agents/page.tsx` → 从数据库读取 Agent 列表
- `app/components/ModelPicker.tsx` → 从 Agent 配置读取可用模型
- 所有 `app/api/agents/*/route.ts` → 使用 Gateway 调用模型

### 需要新增的文件
- `lib/gateway/` — 模型网关
- `lib/auth/` — 认证模块
- `lib/db/` — 数据库连接 + Schema
- `app/admin/` — 管理后台
- `app/api/auth/` — 认证 API
- `app/api/admin/` — 管理 API
- `docker-compose.yml`

### 需要新增的依赖
```
next-auth@beta    # 认证
drizzle-orm       # ORM
drizzle-kit       # 迁移工具
@auth/drizzle-adapter  # NextAuth + Drizzle 集成
bcrypt            # 密码加密
```

## 风险与注意事项

| 风险 | 缓解措施 |
|------|----------|
| SQLite → PostgreSQL 迁移 | 提供迁移脚本，保持 SQLite 作为开发环境选项 |
| 现有 Agent 全部改用 Gateway | 渐进式迁移，先新建 Gateway，再逐个切换 |
| NextAuth v5 还是 beta | 如果不稳定，退回 v4 或自建 JWT |
| 离线环境部署 | Docker 镜像内置所有依赖，不依赖外部 npm registry |

## 测试策略

- **单元测试**：Gateway 层、Auth 逻辑
- **集成测试**：API 端点（认证 + 权限）
- **E2E 测试**：登录 → 使用 Agent → 查看用量
