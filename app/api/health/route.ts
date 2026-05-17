import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    twelveData: !!process.env.TWELVE_DATA_API_KEY
  });
}
