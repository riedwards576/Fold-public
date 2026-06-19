import { z } from "zod";
import { db } from "@/lib/db";
import { tags, studentTags } from "../../../../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { withAuth, httpErr } from "@/lib/http";

const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f59e0b','#84cc16','#a855f7',
];

const bulkTagBody = z.object({
  studentIds: z.array(z.number()).min(1),
  tagId: z.number().optional(),
  tagName: z.string().min(1).optional(),
}).refine(
  (d) => d.tagId !== undefined || (d.tagName !== undefined && d.tagName.length > 0),
  { message: "Either tagId or tagName is required" }
);

export const POST = withAuth(
  async ({ body }) => {
    const { studentIds, tagId: bodyTagId, tagName } = body;

    let resolvedTagId: number;

    if (bodyTagId !== undefined) {
      resolvedTagId = bodyTagId;
    } else {
      // tagName given — look up by exact name, create if not found
      const existing = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(sql`lower(${tags.name})`, tagName!.toLowerCase()))
        .limit(1);

      if (existing.length > 0) {
        resolvedTagId = existing[0].id;
      } else {
        const allTags = await db.select({ id: tags.id }).from(tags);
        const color = COLORS[allTags.length % COLORS.length];
        const [created] = await db
          .insert(tags)
          .values({ name: tagName!, color })
          .returning();
        resolvedTagId = created.id;
      }
    }

    // Insert student_tags for each studentId, ignoring duplicates
    for (const studentId of studentIds) {
      await db
        .insert(studentTags)
        .values({ studentId, tagId: resolvedTagId })
        .onConflictDoNothing();
    }

    return { ok: true, tagId: resolvedTagId, count: studentIds.length };
  },
  { bodySchema: bulkTagBody }
);
