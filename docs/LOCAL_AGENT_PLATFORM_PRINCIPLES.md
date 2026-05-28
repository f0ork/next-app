# 本地 Agent 平台纲领

> 版本：0.2
> 状态：草案
> 范围：本地 Agent 平台的长期产品与架构原则。

## 1. 产品使命

构建一个面向非技术团队、可本地部署的 AI 工作站。

平台应该让不懂 AI、不懂编程的普通用户，在默认不把敏感数据发送到云端的前提下，使用本地模型、私有知识库和打包好的 Agent 完成真实业务工作。

这个产品不是模型运行器，不是 ChatGPT 复制品，也不是只给开发者用的 Agent Builder。它卖的是业务结果：

- 带引用来源的知识库问答
- 文档生成与修改
- 项目方案初稿生成
- 材料审查与清单式风险检查
- 面向重复工作的可复用定制 Agent

第一阶段的核心场景是：

> 基于本地知识库、历史资料和模板，生成并审查项目方案初稿。

## 2. 第一原则：复用优先

任何能力在实现前，都必须先问：

- 是否已有成熟开源项目可以直接使用？
- 是否可以通过 API、SDK、CLI、MCP 或插件方式包装复用？
- 是否可以借鉴成熟产品的交互和架构后微调？
- 这个能力是否属于我们的真正差异化？

默认答案应该是：不要从零自研。

允许自研的重点区域：

- 面向非技术用户的项目工作台体验
- 本地部署的一体化交付体验
- 权限、审计和知识库隔离
- Agent 的打包、版本、分发与治理
- 定制 Agent 到通用 Agent 的沉淀流程
- 项目方案生成等垂直业务工作流

优先复用的区域：

- 模型推理
- 模型网关集成
- RAG 与检索
- 向量数据库
- 文档解析
- 工作流引擎
- 可视化 Builder
- 可观测性
- 评测工具
- 认证授权基础设施

复用必须尊重 license。可以借鉴思路、架构、交互模式和 schema；代码复用必须保证未来商业化安全。

## 3. 产品形态

平台是一个局域网优先的团队本地 AI 工作站。

用户应该看到的是项目、知识库、任务、Agent、输出物和审批点，而不是 prompt、模型内部细节、embedding、上下文窗口或 Agent 编排逻辑。

主要交互模式：

- 工作台为主
- 对话为辅
- 流程引导优先于自由 prompt
- 明确的人工确认节点
- 生成内容有可追溯来源
- 任务历史和审计日志持久化

对话适合用于澄清、局部修改、解释和追问，但不应该是唯一入口。

## 4. MVP 核心闭环

第一版必须跑通这条完整闭环：

1. 管理员配置本地或局域网模型 API。
2. 管理员创建用户、角色、知识库和 Agent 权限。
3. 用户把文档导入有权限的知识库。
4. 平台解析、切片、索引资料，并保存来源引用。
5. 用户创建项目方案任务。
6. Agent 检索相关资料。
7. Agent 生成方案大纲。
8. 用户审查并确认大纲。
9. Agent 按章节生成方案内容。
10. Agent 标记内容是“有资料来源”“合理推断”还是“需要确认”。
11. Agent 检查缺失章节、无依据承诺、敏感信息和交付风险。
12. 用户编辑并确认结果。
13. 平台导出 Markdown 或 DOCX。
14. 平台记录输入、Agent 版本、检索来源、prompt、输出、人工修改、反馈和导出历史。

## 5. 本地优先部署

核心能力必须在没有公网的情况下工作：

- 登录
- 角色和权限管理
- 模型 API 配置
- 知识库管理
- 文档导入与索引
- Agent 执行
- 项目方案生成
- 导出
- 审计日志

云端服务是未来可选扩展，不是 MVP 依赖。

未来云端扩展可以包括：

- Agent 和模板更新
- 模型包下载
- license 同步
- 远程运维
- 可选强模型 fallback
- 备份与恢复

## 6. 模型策略

MVP 使用一个由管理员配置的默认本地模型端点。

平台优先支持 OpenAI-compatible API，这样可以兼容 Ollama、LM Studio、vLLM、llama.cpp server、LocalAI、LiteLLM 或其它本地网关。

管理员配置未来应包含：

- API Base URL
- API Key，可为空
- Model Name
- 上下文长度
- temperature
- 最大输出 token
- 是否支持 streaming
- 是否支持 tool/function calling
- embedding provider
- 连接测试

Agent 应依赖平台的模型网关，而不是直接依赖某个具体 provider。

系统必须对弱模型友好。不要依赖一次性长 prompt，而要依靠任务拆解、检索、模板、schema、检查清单、重试和人工确认补强模型能力。

## 7. 权限与审计

这是团队平台，不是单用户玩具。权限和审计必须从架构第一天开始设计。

原则：

- 能使用某个 Agent，不代表能读取所有知识库。
- 知识库权限比 Agent 权限更重要。
- 每次 Agent 执行必须声明使用了哪些知识库和文档。
- 导出前必须展示资料来源和风险标记。
- 管理员必须能追溯谁用了哪个 Agent、哪些资料、导出了什么内容。

初始角色：

- Owner：管理所有用户、知识库、Agent、任务、导出和模型设置。
- Manager：管理指定项目、成员、知识库和输出审核。
- Member：使用授权 Agent 和知识库完成工作。

初始资源：

- user
- role
- project/workspace
- knowledge base
- document
- agent
- template
- task run
- export
- audit event

## 8. Agent 定义

Agent 不是一个 prompt。

Agent 是一个可安装、可配置、可版本化、有权限边界、可测试的业务能力包。

每个 Agent 应包含：

- manifest
- 使用场景说明
- 输入 schema
- 输出 schema
- 所需权限
- 可用工具
- 工作流步骤
- prompt 或策略文件
- 模板
- 检查清单
- 评测样例
- changelog
- 审计要求

Agent 的目标不是回答得像人，而是稳定完成一个边界明确的任务。

## 9. Agent 包结构 v0.1

推荐目录结构：

```text
agents/
  proposal-generator/
    agent.yaml
    README.md
    prompts/
      outline.md
      section.md
      review.md
      rewrite.md
    schemas/
      input.schema.json
      output.schema.json
    workflows/
      proposal.workflow.yaml
    templates/
      default-proposal.md
      default-proposal.docx
    checklists/
      proposal-review.yaml
      sensitive-info.yaml
    evals/
      rubric.yaml
      cases/
        simple-project/
          input.json
          expected.md
    examples/
      input.example.json
      output.example.md
    changelog.md
```

manifest 示例：

```yaml
id: proposal-generator
name: Project Proposal Generator
version: 0.1.0
description: Generate project proposal drafts from authorized local knowledge bases and templates.
category: document
status: experimental

runtime:
  min_model_tier: local-7b
  requires_streaming: false
  requires_tool_calling: false

inputs:
  schema: ./schemas/input.schema.json
  required:
    - project_name
    - customer_background
    - goal
    - knowledge_base_ids
    - template_id

outputs:
  formats:
    - markdown
    - docx
  schema: ./schemas/output.schema.json

permissions:
  knowledge_base: read
  documents: read
  exports: write
  audit_log: write

workflow:
  file: ./workflows/proposal.workflow.yaml
  human_checkpoints:
    - outline_approval
    - final_export_approval

prompts:
  outline: ./prompts/outline.md
  section: ./prompts/section.md
  review: ./prompts/review.md
  rewrite: ./prompts/rewrite.md

templates:
  default: ./templates/default-proposal.md

checklists:
  proposal_review: ./checklists/proposal-review.yaml
  sensitive_info: ./checklists/sensitive-info.yaml

evals:
  rubric: ./evals/rubric.yaml
  cases_dir: ./evals/cases

audit:
  log_prompts: true
  log_retrieval_sources: true
  log_outputs: true
  require_source_labels: true
```

## 10. Agent 准入标准

定制 Agent 起步可以宽松，但一个 Agent 进入可复用 Agent 池前，必须满足：

- 使用场景明确
- 输入和输出 schema 清晰
- 至少 3 个评测样例
- 有检查清单或评分 rubric
- 有失败边界说明
- 有权限声明
- 有版本号
- 有 changelog
- 使用检索时能记录引用来源
- 支持禁用、升级和回滚

## 11. 项目方案 Agent v0.1

第一版项目方案 Agent 应使用固定流程：

1. 创建项目。
2. 选择授权知识库。
3. 填写项目背景和目标。
4. 检索相关资料。
5. 提取客户需求、约束和目标。
6. 生成方案大纲。
7. 要求用户确认或修改大纲。
8. 按章节生成内容。
9. 标记重要结论是有资料来源、合理推断还是需要确认。
10. 检查缺失章节。
11. 检查敏感信息。
12. 检查无依据承诺。
13. 要求用户修改或确认。
14. 导出 Markdown 或 DOCX。
15. 记录反馈。

目标不是直接生成完美终稿，而是：

> 在 30 分钟内，把分散的本地资料变成一份 70 分可用的项目方案初稿。

高风险内容必须要求确认：

- 价格
- 周期
- 法律承诺
- 交付边界
- 资源投入
- 客户敏感信息
- 内部成本或底价

## 12. 质量评估

Agent 质量不能靠感觉，要靠样例和反馈衡量。

评估维度：

- 是否覆盖需求
- 引用来源是否正确
- 是否有无依据结论
- 是否遗漏关键章节
- 是否泄露敏感信息
- 结构是否清晰
- 是否符合模板
- 人工修改负担是否可接受
- 弱模型下是否稳定

失败要分类：

- 资料不足
- 检索失败
- prompt 不清
- 模型能力不足
- 模板不合适
- 工作流缺步骤
- 用户输入不完整
- 权限或资料选择错误

失败案例应优先进入 eval，再决定是否修改 prompt。

## 13. 平台资产

平台长期沉淀的资产不是代码本身，而是：

- Agent 包
- 行业模板
- 检查清单
- eval 数据集
- 工作流模式
- 知识库组织方式
- 真实失败案例
- 交付 playbook
- 客户需求地图

开发过程中必须把这些资产结构化、版本化地保存下来。

## 14. 定制到通用的飞轮

长期商业闭环是：

```text
定制需求
  -> 定制 Agent
  -> 真实运行和反馈
  -> eval 案例
  -> Agent 改进
  -> 可复用通用 Agent
  -> Agent 池
  -> 后续交付更快
```

每次客户定制都应尽量沉淀可复用部分：

- 输入样例
- 输出样例
- 失败案例
- 修正记录
- 检查清单
- 模板片段
- workflow 片段
- 领域术语

## 15. 开源复用候选

实现同类能力前，必须优先调研这些候选。

模型与网关：

- Ollama
- LM Studio
- vLLM
- llama.cpp server
- LocalAI
- LiteLLM

RAG 与知识库流水线：

- LlamaIndex
- Haystack
- Quivr core
- Dify Knowledge Pipeline
- LangChain retrievers
- Open WebUI 和 AnythingLLM 作为产品参考

向量数据库：

- PostgreSQL + pgvector
- Qdrant
- Chroma
- LanceDB
- FAISS

文档解析：

- Apache Tika
- Unstructured
- MarkItDown
- Docling
- PyMuPDF
- Mammoth
- Pandoc

文档导出：

- Pandoc
- python-docx
- DOCX templates
- LibreOffice headless

工作流与队列：

- LangGraph
- Haystack Pipeline
- Dify Workflow
- Temporal
- Hatchet
- BullMQ

可观测与评测：

- OpenTelemetry
- Langfuse
- Phoenix
- Ragas
- DeepEval
- Promptfoo

认证与授权：

- Auth.js / NextAuth
- Keycloak
- Casbin
- Oso

## 16. MVP 范围

MVP 必须包含：

- 管理员登录
- 用户与角色管理
- 模型 API 配置
- 知识库创建
- 文件上传
- 文档解析与索引
- 知识库权限
- 带引用的问答
- 项目创建
- 项目方案工作流
- 大纲生成
- 大纲确认
- 按章节生成初稿
- 方案检查
- Markdown 或 DOCX 导出
- 任务运行历史
- 引用来源历史
- 用户反馈
- 基础 Agent manifest 标准

可以做，但不阻塞 MVP：

- 多模型 provider
- 独立 embedding provider UI
- PDF 导出
- Excel 深度解析
- 网页导入
- 本地文件夹同步
- 复杂组织架构
- Agent marketplace UI
- 可视化 workflow builder
- 深度 LangGraph 集成
- 云端更新服务
- 远程运维
- 多租户 SaaS

第一阶段明确不做：

- 公开云 SaaS
- 移动 App
- 通用聊天机器人优先
- 任意工具执行
- 浏览器自动化 Agent
- 复杂自主多 Agent 协作
- 让用户写 prompt 作为主要入口
- 未经人工确认就全自动导出方案
- 无权限边界的全局知识库
- 追求一次生成完美方案

## 17. 面向 AI 开发 Agent 的开发原则

因为未来会有大量 Agent 由 AI 创建，平台必须适合 AI 安全扩展。

规则：

- 使用统一 Agent 包结构。
- 一个 Agent 一个目录。
- prompt、schema、workflow、template、eval 分离。
- 禁止把 prompt 散落在应用代码里。
- 每次 Agent 改动都要有验收标准。
- 优先用模板创建新 Agent。
- 记录 Agent 版本和 changelog。
- 用 eval 和运行反馈迭代质量。
- 一次性定制逻辑不要合入平台核心，除非它已经变成可复用平台能力。

## 18. 当前阶段成功标准

第一阶段成功的标志是：

- 本地私有资料可以安全使用。
- 非技术用户不写 prompt 也能完成流程。
- 方案起草比纯人工更快。
- 输出可追溯、可编辑、可导出。
- 管理员可以审计资料使用和导出记录。
- 每次真实运行都能产生反馈，让可复用 Agent 变得更好。

平台应该靠交付稳定性、复用能力和本地可信赢，而不是靠宣称自己有最聪明的模型。
