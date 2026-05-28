import type { AgentDefinition, AgentId } from "@/types";
import { researchAgent } from "./research";
import { stockAgent } from "./stock";
import { ideaAgent } from "./idea";
import { knowledgeAgent } from "./knowledge";
import { mcuAgent } from "./mcu";
import { maasAgent } from "./maas";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

const agents: Record<AgentId, AgentDefinition> = {
  research: researchAgent,
  stock: stockAgent,
  idea: ideaAgent,
  knowledge: knowledgeAgent,
  mcu: mcuAgent,
  maas: maasAgent,
};

export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents[id];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(agents);
}

export async function getEnabledAgents(): Promise<AgentDefinition[]> {
  try {
    const dbAgents = await db.query.agents.findMany({
      where: eq(schema.agents.isEnabled, true),
    });
    if (dbAgents.length > 0) {
      return dbAgents.map((a) => ({
        id: a.id as AgentId,
        name: a.name,
        description: a.description ?? "",
        version: "1.0",
        ui: {
          icon: a.icon ?? "🤖",
          themeColor: a.color ?? "from-gray-500 to-gray-600",
          landingTitle: a.name,
          landingDescription: a.description ?? "",
        },
        intake: { fields: [] },
        prompts: { system: "", clarify: "", execute: "", report: "", followup: "" },
        output: { jsonBlockTag: "" },
      }));
    }
  } catch {}
  return listAgents();
}

export async function getAgentModelConfig(agentId: string): Promise<{ providerId: string; modelId: string }> {
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(schema.agents.id, agentId),
    });
    if (agent) {
      return {
        providerId: agent.providerId ?? "mify",
        modelId: agent.modelId ?? "xiaomi/mimo-v2.5-pro",
      };
    }
  } catch {}
  return { providerId: "mify", modelId: "xiaomi/mimo-v2.5-pro" };
}
