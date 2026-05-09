import { randomUUID } from "crypto";
import type {
  AgentId,
  AgentTaskInput,
  DimensionSelection,
  TaskRun,
  TaskPhase,
  TaskMessage,
  ResearchReport,
  TaskEvent,
} from "@/types";
import { getAgent } from "./agents/registry";
import { buildExecutePrompt, buildExecutePromptFromSelections } from "./agents/research";
import * as store from "./store";
import * as oc from "./opencode/client";

const activeStreams = new Set<string>();

type Subscriber = (event: TaskEvent) => void;
const subscribers = new Map<string, Set<Subscriber>>();

export function subscribe(taskId: string, fn: Subscriber): () => void {
  if (!subscribers.has(taskId)) subscribers.set(taskId, new Set());
  subscribers.get(taskId)!.add(fn);
  return () => subscribers.get(taskId)?.delete(fn);
}

function publish(event: TaskEvent): void {
  subscribers.get(event.taskId)?.forEach((fn) => fn(event));
}

function log(taskId: string, message: string): void {
  publish({ type: "task.log", taskId, message, at: new Date().toISOString() });
}

function updatePhase(task: TaskRun, phase: TaskPhase): TaskRun {
  const updated = { ...task, phase, status: "running" as const, updatedAt: new Date().toISOString() };
  store.saveTask(updated);
  publish({ type: "task.phase.changed", taskId: task.id, phase, at: updated.updatedAt });
  const phaseMessages: Record<string, string> = {
    clarifying: "正在分析需求，准备提出补充问题…",
    executing: "需求已明确，开始深度调研…",
    reporting: "调研完成，正在整理并生成结构化报告…",
    followup: "报告已生成",
    failed: "任务执行出错",
  };
  if (phaseMessages[phase]) log(task.id, phaseMessages[phase]);
  return updated;
}

export async function createTask(
  agentId: AgentId,
  input: AgentTaskInput
): Promise<TaskRun> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`unknown agent: ${agentId}`);

  const sessionId = await oc.createSession();
  const now = new Date().toISOString();
  const task: TaskRun = {
    id: `task_${randomUUID().slice(0, 8)}`,
    agentId,
    title: input.topic,
    phase: "clarifying",
    status: "running",
    createdAt: now,
    updatedAt: now,
    session: { provider: "opencode", sessionId, createdAt: now },
    input,
    inputCompletion: { sufficient: true, missingFields: [] },
    agentVersion: agent.version,
  };

  store.saveTask(task);

  const firstPrompt = `${agent.prompts.system}\n\n${agent.prompts.clarify}\n\n---\n调研类型：${input.mode}\n调研主题：${input.topic}\n核心问题：${input.goal}${input.constraints ? `\n约束：${input.constraints}` : ""}`;

  void startTask(task, firstPrompt).catch(console.error);

  return task;
}

export async function createTaskFromSelections(
  agentId: AgentId,
  topic: string,
  selections: DimensionSelection[]
): Promise<TaskRun> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`unknown agent: ${agentId}`);

  const sessionId = await oc.createSession();
  const now = new Date().toISOString();
  const input: AgentTaskInput = {
    mode: "general_research",
    topic,
    goal: selections.map((s) => `${s.dimensionId}: ${s.selected.join("、")}`).join("；"),
  };

  const task: TaskRun = {
    id: `task_${randomUUID().slice(0, 8)}`,
    agentId,
    title: topic,
    phase: "executing",
    status: "running",
    createdAt: now,
    updatedAt: now,
    session: { provider: "opencode", sessionId, createdAt: now },
    input,
    inputCompletion: { sufficient: true, missingFields: [] },
    agentVersion: agent.version,
  };

  store.saveTask(task);
  publish({ type: "task.phase.changed", taskId: task.id, phase: "executing", at: now });
  log(task.id, `调研任务已创建：${topic}`);
  log(task.id, "正在建立 AI 连接，准备开始调研…");

  const executePrompt = buildExecutePromptFromSelections(agent, topic, selections);
  const fullPrompt = `${agent.prompts.system}\n\n${executePrompt}\n\n${agent.prompts.report}`;

  void startTask(task, fullPrompt).catch(console.error);

  return task;
}

export async function sendUserMessage(
  taskId: string,
  content: string
): Promise<void> {
  const task = store.loadTask(taskId);
  if (!task) throw new Error(`task not found: ${taskId}`);

  const msg: TaskMessage = {
    id: randomUUID(),
    taskId,
    role: "user",
    kind: "chat",
    content,
    createdAt: new Date().toISOString(),
    meta: { phase: task.phase },
  };
  store.appendMessage(taskId, msg);

  const nextPhase: TaskPhase = task.phase === "followup" ? "followup" : "clarifying";
  const updated = updatePhase(task, nextPhase);

  void startTask(updated, content).catch(console.error);
}

async function startTask(task: TaskRun, prompt: string): Promise<void> {
  if (activeStreams.has(task.session.sessionId)) return;
  activeStreams.add(task.session.sessionId);

  const agent = getAgent(task.agentId);
  if (!agent) { activeStreams.delete(task.session.sessionId); return; }

  let fullText = "";
  const msgId = randomUUID();
  let resolveStream: () => void;
  const streamDone = new Promise<void>((r) => { resolveStream = r; });

  const streamPromise = oc.streamSession(task.session.sessionId, {
    onDelta: (delta) => {
      fullText += delta;
      publish({ type: "assistant.message.delta", taskId: task.id, messageId: msgId, delta, at: new Date().toISOString() });
    },
    onDone: () => {
      activeStreams.delete(task.session.sessionId);
      store.appendMessage(task.id, { id: msgId, taskId: task.id, role: "assistant", kind: "chat", content: fullText, createdAt: new Date().toISOString(), meta: { phase: task.phase } });
      resolveStream();
      processAssistantOutput(task, fullText).catch(console.error);
    },
    onError: (err) => {
      activeStreams.delete(task.session.sessionId);
      resolveStream();
      const errTask = { ...task, phase: "failed" as TaskPhase, status: "error" as const, error: { code: "stream_error", message: err }, updatedAt: new Date().toISOString() };
      store.saveTask(errTask);
      publish({ type: "task.error", taskId: task.id, error: err, at: errTask.updatedAt });
    },
  });

  await oc.sendMessage(task.session.sessionId, prompt);
  await Promise.race([streamDone, streamPromise]);
}

async function processAssistantOutput(task: TaskRun, text: string): Promise<void> {
  const agent = getAgent(task.agentId);
  if (!agent) return;

  const hasReportJson = text.includes(`<${agent.output.jsonBlockTag}>`);
  if (hasReportJson) {
    await finalizeReport(task, text, agent.output.jsonBlockTag);
    return;
  }

  if (text.includes("READY_TO_EXECUTE") || task.phase === "executing") {
    await triggerExecution(task);
    return;
  }

  const updated = { ...task, phase: "clarifying" as TaskPhase, status: "waiting_user" as const, updatedAt: new Date().toISOString() };
  store.saveTask(updated);
  publish({ type: "task.phase.changed", taskId: task.id, phase: "clarifying", at: updated.updatedAt });
}

async function triggerExecution(task: TaskRun): Promise<void> {
  const agent = getAgent(task.agentId);
  if (!agent) return;

  const executingTask = updatePhase(task, "executing");
  const history = store.loadMessages(task.id);
  const executePrompt = buildExecutePrompt(agent, task.input, history);

  const reportingTask = updatePhase(executingTask, "reporting");
  await startTask(reportingTask, `${executePrompt}\n\n${agent.prompts.report}`);
}

async function finalizeReport(task: TaskRun, text: string, tag: string): Promise<void> {
  const raw = oc.extractJsonBlock(text, tag);
  if (!raw || typeof raw !== "object") {
    const errTask = { ...task, phase: "failed" as TaskPhase, status: "error" as const, error: { code: "parse_error", message: "报告 JSON 解析失败" }, updatedAt: new Date().toISOString() };
    store.saveTask(errTask);
    publish({ type: "task.error", taskId: task.id, error: errTask.error.message, at: errTask.updatedAt });
    return;
  }

  const reportId = `report_${randomUUID().slice(0, 8)}`;
  const d = raw as Record<string, unknown>;

  const meta = (d.report_meta ?? d.summary ?? {}) as Record<string, unknown>;
  const summary = {
    title: String((d.summary as Record<string, unknown>)?.title ?? meta.title ?? task.title),
    abstract: String((d.summary as Record<string, unknown>)?.abstract ?? meta.summary ?? meta.overview ?? ""),
    keyFindings: ((d.summary as Record<string, unknown>)?.keyFindings ?? d.key_findings ?? d.keyFindings ?? []) as string[],
  };

  const sections = ((d.sections ?? d.detailed_sections ?? d.analysis_sections ?? []) as Array<Record<string, unknown>>)
    .map((s, i) => ({
      id: String(s.id ?? `sec_${i + 1}`),
      title: String(s.title ?? s.section_title ?? ""),
      markdown: String(s.markdown ?? s.content ?? s.analysis ?? ""),
      order: Number(s.order ?? i + 1),
    }));

  const cards = ((d.cards ?? d.highlights ?? d.key_insights ?? []) as Array<Record<string, unknown>>)
    .map((c, i) => {
      const type = String(c.type ?? "insight");
      if (type === "comparison") return { type: "comparison" as const, id: String(c.id ?? `card_${i}`), title: String(c.title ?? ""), columns: (c.columns ?? []) as string[], rows: (c.rows ?? []) as Array<Record<string, string>> };
      if (type === "risk") return { type: "risk" as const, id: String(c.id ?? `card_${i}`), title: String(c.title ?? ""), level: (c.level ?? "medium") as "low" | "medium" | "high", description: String(c.description ?? ""), mitigation: c.mitigation ? String(c.mitigation) : undefined };
      if (type === "timeline") return { type: "timeline" as const, id: String(c.id ?? `card_${i}`), title: String(c.title ?? ""), items: (c.items ?? []) as Array<{ label: string; description: string }> };
      return { type: "insight" as const, id: String(c.id ?? `card_${i}`), title: String(c.title ?? ""), points: (c.points ?? c.key_points ?? []) as string[] };
    });

  const followupSuggestions = ((d.followupSuggestions ?? d.followup_suggestions ?? d.next_steps ?? []) as string[]);

  const report: ResearchReport = {
    id: reportId,
    taskId: task.id,
    agentId: task.agentId,
    version: 1,
    generatedAt: new Date().toISOString(),
    summary,
    sections,
    cards,
    followupSuggestions,
  };

  store.saveReport(report);
  log(task.id, `报告生成完成：${sections.length} 个章节，${cards.length} 张卡片`);

  sections.forEach((sec) => {
    publish({ type: "report.section.added", taskId: task.id, section: sec, at: new Date().toISOString() });
  });

  const updated = { ...task, phase: "followup" as TaskPhase, status: "done" as const, latestReportId: reportId, updatedAt: new Date().toISOString() };
  store.saveTask(updated);

  publish({ type: "report.finalized", taskId: task.id, reportId, at: updated.updatedAt });
  publish({ type: "task.phase.changed", taskId: task.id, phase: "followup", at: updated.updatedAt });
}
