import { z } from "zod";
import { db } from "@/lib/db";
import { tags, studentTags } from "../../../../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";
import { withAuth } from "@/lib/http";

const COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#f59e0b','#84cc16','#a855f7',
];

export const GET = withAuth(async () => {
  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
      count: sql<number>`count(${studentTags.tagId})`,
    })
    .from(tags)
    .leftJoin(studentTags, eq(studentTags.tagId, tags.id))
    .groupBy(tags.id)
    .orderBy(desc(sql`count(${studentTags.tagId})`));
  return rows;
});

const createTagBody = z.object({ name: z.string().min(1).max(64) });

export const POST = withAuth(
  async ({ body }) => {
    const allTags = await db.select({ id: tags.id }).from(tags);
    const color = COLORS[allTags.length % COLORS.length];
    const [created] = await db
      .insert(tags)
      .values({ name: body.name, color })
      .returning();
    return created;
  },
  { bodySchema: createTagBody }
);
