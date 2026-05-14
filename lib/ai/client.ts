import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, streamText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { webSearch, fetchPageContent } from "./search";

const DEFAULT_MODEL_ID = process.env.AI_MODEL_ID ?? "ppio/pa/claude-sonnet-4-6";

function ensureV1Suffix(url: string): string {
  const clean = url.replace(/\/+$/, "");
  return clean.endsWith("/v1") ? clean : clean + "/v1";
}

if (process.env.ANTHROPIC_BASE_URL) {
  const fixed = ensureV1Suffix(process.env.ANTHROPIC_BASE_URL);
  process.env.ANTHROPIC_BASE_URL = fixed;
  console.log("[AI] ANTHROPIC_BASE_URL fixed to:", fixed);
} else {
  process.env.ANTHROPIC_BASE_URL = "https://api.llm.mioffice.cn/anthropic/v1";
}

function getProvider() {
  return createAnthropic({});
}

function getModel(modelId?: string) {
  const finalModelId = modelId ?? DEFAULT_MODEL_ID;
  console.log("[AI] using model:", finalModelId);
  const provider = getProvider();
  return provider(finalModelId);
}

const searchTool = tool({
  description:
    "搜索互联网获取最新信息。返回搜索结果列表（标题、链接、摘要）。用于获取实时数据、市场调研、技术对比等。",
  inputSchema: z.object({
    query: z.string().describe("搜索关键词"),
    maxResults: z.number().optional().describe("最大结果数，默认 8"),
  }),
  execute: async ({ query, maxResults }) => {
    const result = await webSearch(query, maxResults ?? 8);
    return JSON.stringify(result, null, 2);
  },
});

const fetchTool = tool({
  description:
    "抓取指定网页的正文内容。传入 URL，返回页面标题和纯文本内容（已去除 HTML 标签）。用于深入阅读搜索结果中的重要页面。",
  inputSchema: z.object({
    url: z.string().describe("要抓取的网页 URL"),
    maxLength: z.number().optional().describe("最大内容长度，默认 3000 字符"),
  }),
  execute: async ({ url, maxLength }) => {
    const result = await fetchPageContent(url, maxLength ?? 3000);
    return JSON.stringify(result, null, 2);
  },
});

export const researchTools = {
  web_search: searchTool,
  fetch_page: fetchTool,
};

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (fullText: string) => void;
  onError: (err: string) => void;
}

export async function callAI(
  prompt: string,
  systemPrompt?: string,
  modelId?: string
): Promise<string> {
  const result = await generateText({
    model: getModel(modelId),
    system: systemPrompt,
    prompt,
    maxOutputTokens: 4096,
  });
  return result.text;
}

export async function streamResearch(
  prompt: string,
  systemPrompt: string,
  callbacks: StreamCallbacks,
  modelId?: string,
  signal?: AbortSignal
): Promise<void> {
  let fullText = "";

  try {
    const result = streamText({
      model: getModel(modelId),
      system: systemPrompt,
      prompt,
      tools: researchTools,
      stopWhen: stepCountIs(10),
      abortSignal: signal,
      maxOutputTokens: 16384,
      onStepFinish: ({ toolCalls, toolResults }) => {
        if (toolCalls?.length) {
          const toolNames = toolCalls.map((tc) => tc.toolName).join(", ");
          callbacks.onDelta(`\n[搜索中: ${toolNames}]\n`);
        }
      },
    });

    for await (const delta of result.textStream) {
      fullText += delta;
      callbacks.onDelta(delta);
    }

    callbacks.onDone(fullText);
  } catch (err) {
    if (signal?.aborted) return;
    callbacks.onError(err instanceof Error ? err.message : String(err));
  }
}
