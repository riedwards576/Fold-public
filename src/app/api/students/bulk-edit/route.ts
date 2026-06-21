import { z } from "zod";
import { db } from "@/lib/db";
import { students } from "../../../../../drizzle/schema";
import { inArray } from "drizzle-orm";
import { withAuth } from "@/lib/http";

const bulkEditBody = z.object({
  studentIds: z.array(z.number()).min(1),
  isActive: z.boolean().optional(),
  contactedViaIg: z.boolean().optional(),
  gender: z.enum(["M", "F"]).optional(),
  year: z.enum(["freshman", "sophomore", "junior", "senior", "grad", "postgrad"]).optional(),
  memberStatus: z.enum(["prospect", "member", "core"]).optional(),
  funnelStage: z.enum(["new", "reaching_out", "connected", "met", "active", "engaged", "inactive"]).optional(),
  primaryContact: z.string().optional(),
  goals: z.string().optional(),
  notes: z.string().optional(),
  courseMaterial: z.array(z.string()).optional(),
}).refine((d) => {
  const { studentIds, ...rest } = d;
  return Object.keys(rest).length > 0;
}, { message: "At least one field to update is required" });

export const POST = withAuth(
  async ({ body }) => {
    const { studentIds, ...fields } = body;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.isActive !== undefined) patch.isActive = fields.isActive;
    if (fields.contactedViaIg !== undefined) patch.contactedViaIg = fields.contactedViaIg;
    if (fields.gender !== undefined) patch.gender = fields.gender;
    if (fields.year !== undefined) patch.year = fields.year;
    if (fields.memberStatus !== undefined) patch.memberStatus = fields.memberStatus;
    if (fields.funnelStage !== undefined) patch.funnelStage = fields.funnelStage;
    if (fields.primaryContact !== undefined) patch.primaryContact = fields.primaryContact;
    if (fields.goals !== undefined) patch.goals = fields.goals;
    if (fields.notes !== undefined) patch.notes = fields.notes;
    if (fields.courseMaterial !== undefined) patch.courseMaterial = fields.courseMaterial;

    await db.update(students).set(patch as never).where(inArray(students.id, studentIds));
    return { ok: true, count: studentIds.length };
  },
  { bodySchema: bulkEditBody }
);
