import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

export type ProviderType = "anthropic" | "openai" | "ollama" | "litellm";

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  apiKey?: string;
  isEnabled: boolean;
}

export function createProvider(config: ProviderConfig) {
  switch (config.type) {
    case "anthropic":
      return createAnthropic({
        baseURL: config.baseUrl,
        apiKey: config.apiKey ?? "",
      });
    case "openai":
    case "litellm":
      return createOpenAI({
        baseURL: config.baseUrl,
        apiKey: config.apiKey ?? "",
      });
    case "ollama":
      return createOpenAI({
        baseURL: `${config.baseUrl}/v1`,
        apiKey: "ollama",
      });
    default:
      throw new Error(`Unsupported provider type: ${config.type}`);
  }
}

export const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000/v1";
export const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY ?? "sk-litellm-master-key-change-me";

export const DEFAULT_PROVIDER: ProviderConfig = {
  id: "litellm",
  name: "LiteLLM Gateway",
  type: "litellm",
  baseUrl: LITELLM_BASE_URL,
  apiKey: LITELLM_MASTER_KEY,
  isEnabled: true,
};
