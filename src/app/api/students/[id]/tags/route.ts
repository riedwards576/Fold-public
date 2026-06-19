import { z } from "zod";
import { db } from "@/lib/db";
import { studentTags } from "../../../../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { withAuth, httpErr } from "@/lib/http";

const tagBody = z.object({ tagId: z.number().int().positive() });

export const POST = withAuth(
  async ({ params, body }) => {
    const studentId = Number((params as { id: string }).id);
    if (!Number.isFinite(studentId)) throw httpErr.badRequest("invalid student id");
    await db
      .insert(studentTags)
      .values({ studentId, tagId: body.tagId })
      .onConflictDoNothing();
    return { ok: true };
  },
  { bodySchema: tagBody }
);

export const DELETE = withAuth(
  async ({ params, body }) => {
    const studentId = Number((params as { id: string }).id);
    if (!Number.isFinite(studentId)) throw httpErr.badRequest("invalid student id");
    await db
      .delete(studentTags)
      .where(
        and(
          eq(studentTags.studentId, studentId),
          eq(studentTags.tagId, body.tagId)
        )
      );
    return { ok: true };
  },
  { bodySchema: tagBody }
);
