import { z } from "zod";
import { db } from "@/lib/db";
import { students } from "../../../../../drizzle/schema";
import { inArray } from "drizzle-orm";
import { withAuth } from "@/lib/http";

const bulkDeleteBody = z.object({
  studentIds: z.array(z.number()).min(1),
});

export const POST = withAuth(
  async ({ body }) => {
    await db.delete(students).where(inArray(students.id, body.studentIds));
    return { ok: true, count: body.studentIds.length };
  },
  { bodySchema: bulkDeleteBody }
);
