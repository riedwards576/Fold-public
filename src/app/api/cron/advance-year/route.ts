import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { students } from "../../../../../drizzle/schema";
import { eq, inArray } from "drizzle-orm";

// Called by Vercel Cron on June 20 each year (see vercel.json).
// Also accepts POST with the CRON_SECRET header for manual triggering.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runAdvance();
}

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return runAdvance();
}

const ADVANCE: Record<string, string> = {
  freshman:  "sophomore",
  sophomore: "junior",
  junior:    "senior",
  senior:    "postgrad",
  // grad and postgrad stay as-is
};

async function runAdvance() {
  const rows = await db
    .select({ id: students.id, year: students.year })
    .from(students)
    .where(inArray(students.year, Object.keys(ADVANCE) as ("freshman" | "sophomore" | "junior" | "senior")[]));

  const groups: Record<string, number[]> = {};
  for (const { id, year } of rows) {
    if (!year) continue;
    const next = ADVANCE[year];
    if (!next) continue;
    groups[next] ??= [];
    groups[next].push(id);
  }

  let total = 0;
  for (const [nextYear, ids] of Object.entries(groups)) {
    await db
      .update(students)
      .set({ year: nextYear as "sophomore" | "junior" | "senior" | "postgrad" })
      .where(inArray(students.id, ids));
    total += ids.length;
  }

  return NextResponse.json({
    ok: true,
    advanced: total,
    breakdown: Object.fromEntries(
      Object.entries(groups).map(([y, ids]) => [y, ids.length])
    ),
    ranAt: new Date().toISOString(),
  });
}
