export type AgentId = "research";

export type ResearchMode =
  | "competitor_analysis"
  | "tech_selection"
  | "general_research";

export type TaskPhase =
  | "intake"
  | "clarifying"
  | "executing"
  | "reporting"
  | "followup"
  | "completed"
  | "failed";

export type TaskStatus =
  | "idle"
  | "running"
  | "waiting_user"
  | "done"
  | "error";

export interface AgentTaskInput {
  mode: ResearchMode;
  topic: string;
  goal: string;
  constraints?: string;
  extraContext?: string;
}

export interface OpencodeSessionBinding {
  provider: "opencode" | "ai-sdk";
  sessionId: string;
  createdAt: string;
  lastEventAt?: string;
}

export interface InputCompletion {
  sufficient: boolean;
  missingFields: string[];
}

export interface AgentQuestion {
  id: string;
  taskId: string;
  question: string;
  field?: string;
  inputHint?: "text" | "textarea" | "select" | "multi_select";
  options?: Array<{ label: string; value: string }>;
  required: boolean;
}

export interface TaskRun {
  id: string;
  agentId: AgentId;
  title: string;
  phase: TaskPhase;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  session: OpencodeSessionBinding;
  input: AgentTaskInput;
  inputCompletion: InputCompletion;
  latestQuestion?: AgentQuestion;
  latestReportId?: string;
  error?: { code: string; message: string };
  agentVersion: string;
}

export interface TaskMessage {
  id: string;
  taskId: string;
  role: "user" | "assistant";
  kind: "chat" | "question" | "instruction" | "report_notice";
  content: string;
  createdAt: string;
  meta?: {
    phase?: TaskPhase;
    opencodeMessageId?: string;
    structured?: boolean;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  markdown: string;
  order: number;
}

export interface InsightCard {
  type: "insight";
  id: string;
  title: string;
  points: string[];
}

export interface ComparisonCard {
  type: "comparison";
  id: string;
  title: string;
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface TimelineCard {
  type: "timeline";
  id: string;
  title: string;
  items: Array<{ label: string; description: string }>;
}

export interface RiskCard {
  type: "risk";
  id: string;
  title: string;
  level: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

export type ReportCard =
  | InsightCard
  | ComparisonCard
  | TimelineCard
  | RiskCard;

export interface ResearchReport {
  id: string;
  taskId: string;
  agentId: AgentId;
  version: number;
  generatedAt: string;
  summary: {
    title: string;
    abstract: string;
    keyFindings: string[];
  };
  sections: ReportSection[];
  cards: ReportCard[];
  followupSuggestions: string[];
}

export type TaskEvent =
  | { type: "task.phase.changed"; taskId: string; phase: TaskPhase; at: string }
  | { type: "assistant.message.delta"; taskId: string; messageId: string; delta: string; at: string }
  | { type: "assistant.question.generated"; taskId: string; question: AgentQuestion; at: string }
  | { type: "task.log"; taskId: string; message: string; at: string }
  | { type: "report.section.added"; taskId: string; section: ReportSection; at: string }
  | { type: "report.finalized"; taskId: string; reportId: string; at: string }
  | { type: "task.error"; taskId: string; error: string; at: string };

export interface DimensionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Dimension {
  id: string;
  question: string;
  hint?: string;
  multiple: boolean;
  options: DimensionOption[];
}

export interface AnalyzeResult {
  topic: string;
  summary: string;
  dimensions: Dimension[];
}

export interface DimensionSelection {
  dimensionId: string;
  selected: string[];
}

export interface FormField {
  type: "text" | "textarea" | "select";
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
}

export interface AgentDefinition {
  id: AgentId;
  version: string;
  name: string;
  description: string;
  ui: {
    icon: string;
    themeColor: string;
    landingTitle: string;
    landingDescription: string;
  };
  intake: {
    fields: FormField[];
  };
  prompts: {
    system: string;
    clarify: string;
    execute: string;
    report: string;
    followup: string;
  };
  output: {
    jsonBlockTag: string;
  };
}
