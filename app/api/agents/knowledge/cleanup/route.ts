import { NextResponse } from "next/server";
import { findDuplicates, cleanupOldEntries, getStats } from "@/lib/kb/store";

export const runtime = "nodejs";

export async function POST() {
  const duplicates = await findDuplicates();
  const removed = await cleanupOldEntries(90);
  const stats = getStats();

  return NextResponse.json({
    duplicatesFound: duplicates.length,
    staleRemoved: removed,
    stats,
  });
}
