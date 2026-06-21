import { z } from "zod";
import { db } from "@/lib/db";
import { students } from "../../../../../drizzle/schema";
import { inArray } from "drizzle-orm";
import { withAuth } from "@/lib/http";

const bulkEditBody = z.object({
  studentIds: z.array(z.number()).min(1),
  isActive: z.boolean().optional(),
  year: z.enum(["freshman", "sophomore", "junior", "senior", "grad", "postgrad"]).optional(),
}).refine((d) => d.isActive !== undefined || d.year !== undefined, {
  message: "At least one field to update is required",
});

export const POST = withAuth(
  async ({ body }) => {
    const { studentIds, ...fields } = body;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.isActive !== undefined) patch.isActive = fields.isActive;
    if (fields.year !== undefined) patch.year = fields.year;

    await db.update(students).set(patch as never).where(inArray(students.id, studentIds));
    return { ok: true, count: studentIds.length };
  },
  { bodySchema: bulkEditBody }
);
