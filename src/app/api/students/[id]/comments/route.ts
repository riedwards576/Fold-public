import { z } from "zod";
import { withAuth } from "@/lib/http";
import { db } from "@/lib/db";
import { studentComments, users } from "../../../../../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const postSchema = z.object({
  content: z.string().min(1),
});

const deleteSchema = z.object({
  commentId: z.number(),
});

export const POST = withAuth<{ id: string }, typeof postSchema>(
  async ({ params, body, user }) => {
    const studentId = Number(params.id);
    if (!Number.isFinite(studentId)) {
      return { ok: false, error: "invalid id" };
    }
    const [created] = await db
      .insert(studentComments)
      .values({ studentId, userId: user.id, content: body.content })
      .returning();

    return {
      ok: true,
      comment: {
        id: created.id,
        content: created.content,
        createdAt: created.createdAt.toISOString(),
        byName: user.displayName,
      },
    };
  },
  { bodySchema: postSchema }
);

export const DELETE = withAuth<{ id: string }, typeof deleteSchema>(
  async ({ params, body, user }) => {
    const studentId = Number(params.id);
    if (!Number.isFinite(studentId)) {
      return { ok: false, error: "invalid id" };
    }
    await db
      .delete(studentComments)
      .where(
        and(
          eq(studentComments.id, body.commentId),
          eq(studentComments.userId, user.id)
        )
      );
    return { ok: true };
  },
  { bodySchema: deleteSchema }
);
