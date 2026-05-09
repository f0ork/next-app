import fs from "fs";
import path from "path";
import type { TaskRun, TaskMessage, ResearchReport } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data", "tasks");

function taskDir(taskId: string): string {
  return path.join(DATA_DIR, taskId);
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function atomicWrite(filePath: string, data: string): void {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, data, "utf-8");
  fs.renameSync(tmp, filePath);
}

const taskCache = new Map<string, TaskRun>();

export function saveTask(task: TaskRun): void {
  taskCache.set(task.id, task);
  ensureDir(taskDir(task.id));
  atomicWrite(path.join(taskDir(task.id), "task.json"), JSON.stringify(task, null, 2));
}

export function loadTask(taskId: string): TaskRun | undefined {
  if (taskCache.has(taskId)) return taskCache.get(taskId);
  const file = path.join(taskDir(taskId), "task.json");
  if (!fs.existsSync(file)) return undefined;
  try {
    const task = JSON.parse(fs.readFileSync(file, "utf-8")) as TaskRun;
    taskCache.set(taskId, task);
    return task;
  } catch {
    return undefined;
  }
}

export function listTasks(): TaskRun[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  return fs
    .readdirSync(DATA_DIR)
    .map((id) => loadTask(id))
    .filter((t): t is TaskRun => t !== undefined)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function appendMessage(taskId: string, message: TaskMessage): void {
  ensureDir(taskDir(taskId));
  const line = JSON.stringify(message) + "\n";
  fs.appendFileSync(path.join(taskDir(taskId), "messages.jsonl"), line, "utf-8");
}

export function loadMessages(taskId: string): TaskMessage[] {
  const file = path.join(taskDir(taskId), "messages.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line) as TaskMessage; }
      catch { return null; }
    })
    .filter((m): m is TaskMessage => m !== null);
}

export function saveReport(report: ResearchReport): void {
  ensureDir(taskDir(report.taskId));
  atomicWrite(
    path.join(taskDir(report.taskId), "report.json"),
    JSON.stringify(report, null, 2)
  );
}

export function loadReport(taskId: string): ResearchReport | undefined {
  const file = path.join(taskDir(taskId), "report.json");
  if (!fs.existsSync(file)) return undefined;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")) as ResearchReport; }
  catch { return undefined; }
}
