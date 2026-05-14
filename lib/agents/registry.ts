import type { AgentDefinition, AgentId } from "@/types";
import { researchAgent } from "./research";
import { stockAgent } from "./stock";

const agents: Record<AgentId, AgentDefinition> = {
  research: researchAgent,
  stock: stockAgent,
};

export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents[id];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(agents);
}
