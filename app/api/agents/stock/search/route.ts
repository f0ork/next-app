import { NextRequest, NextResponse } from "next/server";
import { searchStock } from "@/lib/stock/api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q");
  if (!keyword?.trim()) {
    return NextResponse.json({ error: "q parameter required" }, { status: 400 });
  }

  const results = await searchStock(keyword.trim());
  return NextResponse.json({ results });
}
