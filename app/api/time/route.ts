import { NextResponse } from "next/server";
import rateLimit from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const limiter = rateLimit({ interval: 60_000 });

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export async function GET(req: Request) {
  try {
    await limiter.check(60, `time:${getClientIp(req)}`);
  } catch {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }
  return NextResponse.json({ time: new Date().toISOString() });
}
