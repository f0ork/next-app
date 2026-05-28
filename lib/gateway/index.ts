import { createProvider, DEFAULT_PROVIDER, type ProviderConfig } from "./providers";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface GatewayOptions {
  providerId?: string;
  modelId?: string;
  userId?: string;
  agentId?: string;
}

const providerCache = new Map<string, ReturnType<typeof createProvider>>();

async function getProviderConfig(providerId: string): Promise<ProviderConfig> {
  const cached = await db.query.modelProviders.findFirst({
    where: eq(schema.modelProviders.id, providerId),
  });
  if (cached) {
    return {
      id: cached.id,
      name: cached.name,
      type: cached.type as ProviderConfig["type"],
      baseUrl: cached.baseUrl,
      apiKey: cached.apiKey ?? undefined,
      isEnabled: cached.isEnabled,
    };
  }
  if (providerId === DEFAULT_PROVIDER.id) return DEFAULT_PROVIDER;
  throw new Error(`Provider ${providerId} not found`);
}

export async function getProvider(providerId: string = "mify") {
  if (providerCache.has(providerId)) return providerCache.get(providerId)!;
  const config = await getProviderConfig(providerId);
  const provider = createProvider(config);
  providerCache.set(providerId, provider);
  return provider;
}

export async function getModel(options: GatewayOptions = {}) {
  let providerId = options.providerId ?? "mify";
  let modelId = options.modelId ?? "xiaomi/mimo-v2.5-pro";

  if (options.agentId && !options.providerId) {
    try {
      const agent = await db.query.agents.findFirst({
        where: eq(schema.agents.id, options.agentId),
      });
      if (agent) {
        providerId = agent.providerId ?? providerId;
        modelId = agent.modelId ?? modelId;
      }
    } catch {}
  }

  const provider = await getProvider(providerId);
  return provider(modelId);
}

export function getProviderAndModel(options: GatewayOptions = {}) {
  return {
    providerId: options.providerId ?? "mify",
    modelId: options.modelId ?? "xiaomi/mimo-v2.5-pro",
  };
}

export async function recordUsage(params: {
  userId?: string;
  agentId?: string;
  providerId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}) {
  await db.insert(schema.usageLogs).values({
    id: randomUUID(),
    userId: params.userId ?? null,
    agentId: params.agentId ?? null,
    providerId: params.providerId,
    modelId: params.modelId,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    totalTokens: params.inputTokens + params.outputTokens,
    durationMs: params.durationMs,
    createdAt: new Date(),
  });
}

export function clearProviderCache() {
  providerCache.clear();
}
