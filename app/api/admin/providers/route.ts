import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const providers = await db.query.modelProviders.findMany({
    columns: { apiKey: false },
  });
  return NextResponse.json(providers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  await db.insert(schema.modelProviders).values({
    id: body.id as string,
    name: body.name as string,
    type: body.type as "anthropic" | "openai" | "ollama",
    baseUrl: body.baseUrl as string,
    apiKey: (body.apiKey as string) ?? null,
    isEnabled: (body.isEnabled as boolean) ?? true,
    config: "{}",
    createdAt: new Date(),
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, ...updates } = (await req.json()) as Record<string, unknown>;
  if (!id) {
    return NextResponse.json({ error: "Provider ID required" }, { status: 400 });
  }

  await db.update(schema.modelProviders)
    .set(updates)
    .where(eq(schema.modelProviders.id, id as string));

  return NextResponse.json({ success: true });
}
