import type { AgentDefinition, AgentId } from "@/types";
import { researchAgent } from "./research";

const agents: Record<AgentId, AgentDefinition> = {
  research: researchAgent,
};

export function getAgent(id: AgentId): AgentDefinition | undefined {
  return agents[id];
}

export function listAgents(): AgentDefinition[] {
  return Object.values(agents);
}
