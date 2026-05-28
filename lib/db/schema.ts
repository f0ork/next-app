import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role", { enum: ["admin", "user"] }).default("user").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const agents = sqliteTable("agents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true).notNull(),
  modelId: text("model_id"),
  providerId: text("provider_id"),
  config: text("config").default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const modelProviders = sqliteTable("model_providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["anthropic", "openai", "ollama"] }).notNull(),
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).default(true).notNull(),
  config: text("config").default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const usageLogs = sqliteTable("usage_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  agentId: text("agent_id").references(() => agents.id),
  providerId: text("provider_id"),
  modelId: text("model_id"),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  totalTokens: integer("total_tokens").default(0),
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
