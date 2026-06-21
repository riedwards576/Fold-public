import { z } from "zod";
import { db } from "@/lib/db";
import {
  students, attendances, contactAttempts,
  studentTags, studentComments, rideAssignments,
} from "../../../../../drizzle/schema";
import { inArray, isNull, sql } from "drizzle-orm";
import { withAuth } from "@/lib/http";

const bulkDeleteBody = z.object({
  studentIds: z.array(z.number()).min(1),
});

export const POST = withAuth(
  async ({ body }) => {
    const ids = body.studentIds;

    // Manually cascade child records — libsql doesn't enforce FK cascades by default.
    // Order matters: ride_assignments before attendances, everything before students.
    await db.delete(rideAssignments).where(inArray(rideAssignments.studentId, ids));
    await db.delete(attendances).where(inArray(attendances.studentId, ids));
    await db.delete(contactAttempts).where(inArray(contactAttempts.studentId, ids));
    await db.delete(studentTags).where(inArray(studentTags.studentId, ids));
    await db.delete(studentComments).where(inArray(studentComments.studentId, ids));

    // Clear self-referential invited_by_student_id pointers before deleting
    await db
      .update(students)
      .set({ invitedByStudentId: null })
      .where(inArray(students.invitedByStudentId as Parameters<typeof inArray>[0], ids));

    await db.delete(students).where(inArray(students.id, ids));

    return { ok: true, count: ids.length };
  },
  { bodySchema: bulkDeleteBody }
);
