import { NextResponse } from "next/server";

export const runtime = "nodejs";

const OPENCODE_URL = process.env.OPENCODE_SERVER_URL ?? "http://127.0.0.1:4096";

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

export async function GET() {
  try {
    const res = await fetch(`${OPENCODE_URL}/config`);
    if (!res.ok) throw new Error(`config fetch failed: ${res.status}`);
    const config = (await res.json()) as {
      model?: string;
      provider?: Record<string, { name?: string; models?: Record<string, unknown> }>;
    };

    const currentModel = config.model ?? "";
    const providers = config.provider ?? {};

    const groups: ProviderGroup[] = Object.entries(providers)
      .map(([providerID, p]) => {
        const models: ModelItem[] = Object.keys(p.models ?? {}).map((modelID) => ({
          id: `${providerID}/${modelID}`,
          modelID,
          providerID,
          label: modelID.split("/").pop() ?? modelID,
        }));
        return {
          providerID,
          name: PROVIDER_DISPLAY[providerID] ?? providerID,
          models,
        };
      })
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

    return NextResponse.json({ groups, currentModel });
  } catch {
    return NextResponse.json({ error: "无法连接 opencode server" }, { status: 503 });
  }
}
