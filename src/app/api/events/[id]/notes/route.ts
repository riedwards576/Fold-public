import { z } from "zod";
import { withAuth } from "@/lib/http";
import { db } from "@/lib/db";
import { events } from "../../../../../../drizzle/schema";
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
      .update(events)
      .set({ notes: body.notes })
      .where(eq(events.id, id));
    return { ok: true };
  },
  { bodySchema }
);
