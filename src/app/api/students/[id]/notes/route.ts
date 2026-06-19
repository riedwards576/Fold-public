import { z } from "zod";
import { withAuth } from "@/lib/http";
import { db } from "@/lib/db";
import { students } from "../../../../../../drizzle/schema";
import { eq } from "drizzle-orm";

const bodySchema = z.object({
  notes: z.string(),
});

export const POST = withAuth<{ id: string }, typeof bodySchema>(
  async ({ params, body }) => {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return { ok: false, error: "invalid id" };
    }
    await db
      .update(students)
      .set({ notes: body.notes, updatedAt: new Date() })
      .where(eq(students.id, id));
    return { ok: true };
  },
  { bodySchema }
);
