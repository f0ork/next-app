import { NextRequest, NextResponse } from "next/server";
import { listEntries, getCategories, getStats, deleteEntry } from "@/lib/kb/store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "list";

  if (action === "categories") {
    return NextResponse.json({ categories: getCategories() });
  }
  if (action === "stats") {
    return NextResponse.json({ stats: getStats() });
  }

  const limit = Number(url.searchParams.get("limit") ?? 100);
  const entries = listEntries(limit);
  return NextResponse.json({ entries });
}

export async function DELETE(req: NextRequest) {
  const { id } = (await req.json()) as { id: string };
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = deleteEntry(id);
  return NextResponse.json({ ok });
}
