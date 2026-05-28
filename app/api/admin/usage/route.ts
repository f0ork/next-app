import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { sql } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const byAgent = await db.select({
    agentId: schema.usageLogs.agentId,
    totalTokens: sql<number>`sum(${schema.usageLogs.totalTokens})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.usageLogs)
    .groupBy(schema.usageLogs.agentId);

  const byUser = await db.select({
    userId: schema.usageLogs.userId,
    totalTokens: sql<number>`sum(${schema.usageLogs.totalTokens})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.usageLogs)
    .groupBy(schema.usageLogs.userId);

  const total = await db.select({
    totalTokens: sql<number>`sum(${schema.usageLogs.totalTokens})`,
    count: sql<number>`count(*)`,
  })
    .from(schema.usageLogs);

  return NextResponse.json({
    byAgent,
    byUser,
    total: total[0] ?? { totalTokens: 0, count: 0 },
  });
}
