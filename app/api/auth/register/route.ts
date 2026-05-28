import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = (await req.json()) as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password || !name) {
      return NextResponse.json({ error: "邮箱、密码和姓名均为必填" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const existing = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existing) {
      return NextResponse.json({ error: "邮箱已注册" }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const id = randomUUID();

    await db.insert(schema.users).values({
      id,
      email,
      password: hashedPassword,
      name,
      role: "user",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ id, email, name, role: "user" }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
