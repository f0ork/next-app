import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await db.query.users.findMany({
    columns: { password: false },
  });
  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, ...updates } = (await req.json()) as Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  await db.update(schema.users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(schema.users.id, id as string));

  return NextResponse.json({ success: true });
}
