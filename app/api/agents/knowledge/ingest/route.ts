import { NextRequest, NextResponse } from "next/server";
import { buildEntry } from "@/lib/kb/processor";
import { saveEntry } from "@/lib/kb/store";
import { callAI } from "@/lib/ai/client";

export const runtime = "nodejs";

async function extractContent(
  content: string,
  inputType: string,
  fileName?: string,
  fileData?: string
): Promise<{ title: string; extracted: string }> {
  if (inputType === "url") {
    try {
      const res = await fetch(content.trim(), {
        signal: AbortSignal.timeout(15000),
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (!res.ok) return { title: content, extracted: `HTTP ${res.status}` };
      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : content;
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 5000);
      return { title, extracted: text };
    } catch {
      return { title: content, extracted: "无法访问该链接" };
    }
  }

  if (inputType === "image" && fileData) {
    const description = await callAI(
      `请详细描述这张图片的内容，包括文字、图表、关键信息等。如果是截图，尽量提取所有可见文字。`,
      "你是一个图片内容提取助手，准确描述图片中的所有内容。"
    );
    return {
      title: fileName ?? "图片",
      extracted: description,
    };
  }

  if (inputType === "file" && fileData) {
    const text = Buffer.from(fileData, "base64").toString("utf-8");
    return {
      title: fileName ?? "文件",
      extracted: text.slice(0, 10000),
    };
  }

  return {
    title: content.slice(0, 50) + (content.length > 50 ? "…" : ""),
    extracted: content,
  };
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";

  let content = "";
  let inputType = "text";
  let fileName: string | undefined;
  let fileData: string | undefined;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    inputType = (formData.get("inputType") as string) ?? "file";

    if (file) {
      fileName = file.name;
      const buffer = Buffer.from(await file.arrayBuffer());
      fileData = buffer.toString("base64");

      if (file.type.startsWith("image/")) {
        inputType = "image";
        content = `[图片: ${file.name}]`;
      } else {
        inputType = "file";
        content = buffer.toString("utf-8").slice(0, 10000);
      }
    } else {
      content = (formData.get("content") as string) ?? "";
      inputType = (formData.get("inputType") as string) ?? "text";
    }
  } else {
    const body = (await req.json()) as {
      content: string;
      inputType?: string;
      fileName?: string;
      fileData?: string;
    };
    content = body.content;
    inputType = body.inputType ?? "text";
    fileName = body.fileName;
    fileData = body.fileData;
  }

  if (!content?.trim() && !fileData) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  const { title, extracted } = await extractContent(content, inputType, fileName, fileData);

  const summaryPrompt = `请对以下内容进行总结和分类，输出 JSON：

内容：
${extracted.slice(0, 3000)}

输出格式（严格 JSON，无其他文字）：
{"summary":"一句话摘要（不超过100字）","category":"分类（如：技术/产品/市场/工具/概念）","tags":["标签1","标签2","标签3"]}`;

  const aiResult = await callAI(summaryPrompt);
  let summary = extracted.slice(0, 100);
  let category = "未分类";
  let tags: string[] = [];

  try {
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary ?? summary;
      category = parsed.category ?? category;
      tags = parsed.tags ?? tags;
    }
  } catch { /* ignored */ }

  const entry = buildEntry(title, extracted.slice(0, 10000), summary, category, tags, content || fileName || "", inputType as "text" | "url" | "file");
  await saveEntry(entry);

  return NextResponse.json({
    ok: true,
    id: entry.id,
    title,
    category,
    tags,
    summary,
  });
}
