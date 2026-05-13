import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export interface ModelItem {
  id: string;
  modelID: string;
  providerID: string;
  label: string;
}

export interface ProviderGroup {
  providerID: string;
  name: string;
  models: ModelItem[];
}

const PROVIDER_DISPLAY: Record<string, string> = {
  "Mify-Xiaomi": "小米 Xiaomi",
  "Mify-Anthropic": "Anthropic (Claude)",
  "Mify-Vertex": "Google Vertex (Gemini)",
  "Mify-OpenAI": "OpenAI (Azure)",
  "Mify-Tongyi": "通义 Tongyi",
  "Mify-Zhipu": "智谱 Zhipu",
  "Mify-PPIO": "PPIO",
  "Mify-Siliconflow": "硅基流动 Siliconflow",
  "Mify-Moonshot": "Moonshot (Kimi)",
  "Mify-Kimi": "Kimi (Volcengine)",
  "Mify-Minimax1": "MiniMax",
  "Mify-Baidu": "百度 Baidu",
  "Mify-Wenxin": "文心 Wenxin",
  "Mify-Hunyuan": "混元 Hunyuan",
};

const FALLBACK_MODELS: ProviderGroup[] = [
  {
    providerID: "anthropic",
    name: "Anthropic (Claude)",
    models: [
      { id: "ppio/pa/claude-sonnet-4-6", modelID: "ppio/pa/claude-sonnet-4-6", providerID: "anthropic", label: "Claude Sonnet 4.6" },
      { id: "ppio/pa/claude-opus-4-6", modelID: "ppio/pa/claude-opus-4-6", providerID: "anthropic", label: "Claude Opus 4.6" },
      { id: "ppio/pa/claude-haiku-4-5", modelID: "ppio/pa/claude-haiku-4-5", providerID: "anthropic", label: "Claude Haiku 4.5" },
    ],
  },
  {
    providerID: "xiaomi",
    name: "小米 Xiaomi",
    models: [
      { id: "xiaomi/mimo-v2.5-pro", modelID: "xiaomi/mimo-v2.5-pro", providerID: "xiaomi", label: "MiMo v2.5 Pro" },
      { id: "xiaomi/mimo-v2-pro", modelID: "xiaomi/mimo-v2-pro", providerID: "xiaomi", label: "MiMo v2 Pro" },
    ],
  },
  {
    providerID: "openai",
    name: "OpenAI",
    models: [
      { id: "azure_openai/gpt-5.2", modelID: "azure_openai/gpt-5.2", providerID: "openai", label: "GPT-5.2" },
      { id: "azure_openai/gpt-5", modelID: "azure_openai/gpt-5", providerID: "openai", label: "GPT-5" },
    ],
  },
  {
    providerID: "google",
    name: "Google (Gemini)",
    models: [
      { id: "vertex_ai/gemini-3.1-pro-preview", modelID: "vertex_ai/gemini-3.1-pro-preview", providerID: "google", label: "Gemini 3.1 Pro" },
      { id: "vertex_ai/gemini-2.5-pro", modelID: "vertex_ai/gemini-2.5-pro", providerID: "google", label: "Gemini 2.5 Pro" },
    ],
  },
];

function loadFromConfig(): ProviderGroup[] {
  const configPaths = [
    join(process.env.HOME ?? "/root", ".config/opencode/opencode.json"),
    join(process.env.HOME ?? "/root", ".config/opencode/opencode.jsonc"),
  ];

  for (const configPath of configPaths) {
    if (!existsSync(configPath)) continue;
    try {
      const raw = readFileSync(configPath, "utf-8");
      const cleaned = raw.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
      const config = JSON.parse(cleaned) as {
        provider?: Record<string, { name?: string; models?: Record<string, unknown> }>;
      };

      const providers = config.provider ?? {};
      return Object.entries(providers)
        .map(([providerID, p]) => ({
          providerID,
          name: PROVIDER_DISPLAY[providerID] ?? providerID,
          models: Object.keys(p.models ?? {}).map((modelID) => ({
            id: `${providerID}/${modelID}`,
            modelID,
            providerID,
            label: modelID.split("/").pop() ?? modelID,
          })),
        }))
        .filter((g) => g.models.length > 0)
        .sort((a, b) => {
          const priority = ["Mify-Xiaomi", "Mify-Anthropic", "Mify-Vertex", "Mify-PPIO"];
          const ai = priority.indexOf(a.providerID);
          const bi = priority.indexOf(b.providerID);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.name.localeCompare(b.name);
        });
    } catch {
      continue;
    }
  }

  return FALLBACK_MODELS;
}

export async function GET() {
  const groups = loadFromConfig();
  const currentModel = process.env.AI_MODEL_ID ?? "ppio/pa/claude-sonnet-4-6";
  return NextResponse.json({ groups, currentModel });
}
