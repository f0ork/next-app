import { NextRequest, NextResponse } from "next/server";
import { exportAll, importEntries } from "@/lib/kb/store";
import type { KBEntry } from "@/lib/kb/store";

export const runtime = "nodejs";

export async function GET() {
  const entries = exportAll();
  return new NextResponse(JSON.stringify({ entries }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=knowledge-export.json",
    },
  });
}

export async function POST(req: NextRequest) {
  const { entries } = (await req.json()) as { entries: KBEntry[] };
  if (!Array.isArray(entries)) {
    return NextResponse.json({ error: "entries array required" }, { status: 400 });
  }
  const count = await importEntries(entries);
  return NextResponse.json({ ok: true, imported: count });
}
