import { NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE } from "@/lib/auth";

export async function POST(req: Request) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const password = body && typeof body.password === "string" ? body.password : "";

  if (password !== expected) {
    return NextResponse.json({ error: "incorrect password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, expected, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_MAX_AGE
  });
  return res;
}
