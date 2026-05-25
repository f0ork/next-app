import type { AgentDefinition, AgentId } from "@/types";
import { researchAgent } from "./research";
import { stockAgent } from "./stock";
import { ideaAgent } from "./idea";
import { knowledgeAgent } from "./knowledge";
import { mcuAgent } from "./mcu";
import { maasAgent } from "./maas";

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
