import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { students, attendances, events, contactAttempts, users, tags, studentTags, studentComments } from "../../../../drizzle/schema";
import { eq, desc, asc } from "drizzle-orm";
import StudentForm from "./StudentForm";
import { parseStudent } from "@/lib/parse-student";
import DraftOutreach from "./DraftOutreach";
import TagManager from "./TagManager";
import ActivityTimeline from "./ActivityTimeline";
import NotesEditor from "./NotesEditor";
import CommentsSection from "./CommentsSection";
import {
  perStudentHealth,
  type StudentLite,
  type AttendanceLite,
} from "@/lib/health-metrics";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isFinite(id)) notFound();
  const [s] = await db.select().from(students).where(eq(students.id, id)).limit(1);
  if (!s) notFound();

  const history = await db
    .select({ a: attendances, e: events })
    .from(attendances)
    .innerJoin(events, eq(events.id, attendances.eventId))
    .where(eq(attendances.studentId, id))
    .orderBy(desc(attendances.recordedAt));

  const attemptRows = await db
    .select({
      id: contactAttempts.id,
      channel: contactAttempts.channel,
      channelDetail: contactAttempts.channelDetail,
      attemptedAt: contactAttempts.attemptedAt,
      responded: contactAttempts.responded,
      notes: contactAttempts.notes,
      byName: users.displayName,
    })
    .from(contactAttempts)
    .leftJoin(users, eq(users.id, contactAttempts.attemptedByUserId))
    .where(eq(contactAttempts.studentId, id))
    .orderBy(desc(contactAttempts.attemptedAt));

  // Build unified activity timeline
  type TimelineItem =
    | { type: "attendance"; date: string; eventId: number; eventName: string }
    | { type: "contact"; date: string; channel: string; channelDetail: string | null; responded: boolean; notes: string | null; byName: string | null };

  const timelineItems: TimelineItem[] = [
    ...history.map(({ a, e }) => ({
      type: "attendance" as const,
      date: e.startDate.toISOString(),
      eventId: e.id,
      eventName: e.name,
    })),
    ...attemptRows.map((a) => ({
      type: "contact" as const,
      date: a.attemptedAt.toISOString(),
      channel: a.channel,
      channelDetail: a.channelDetail,
      responded: a.responded,
      notes: a.notes,
      byName: a.byName,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const rosterRows = await db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      invitedByStudentId: students.invitedByStudentId,
    })
    .from(students)
    .orderBy(asc(students.firstName));
  const roster = rosterRows
    .filter((r) => r.id !== id)
    .map((r) => ({
      id: r.id,
      name: `${r.firstName}${r.lastName ? " " + r.lastName : ""}`,
    }));

  const studentsForHealth: StudentLite[] = rosterRows.map((r) => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    invitedByStudentId: r.invitedByStudentId ?? null,
  }));
  const allAttendanceRows = await db
    .select({
      studentId: attendances.studentId,
      eventId: attendances.eventId,
      recordedAt: attendances.recordedAt,
    })
    .from(attendances);
  const attendancesForHealth: AttendanceLite[] = allAttendanceRows.map((a) => ({
    studentId: a.studentId,
    eventId: a.eventId,
    recordedAt: new Date(a.recordedAt),
  }));
  const healthMap = perStudentHealth(studentsForHealth, attendancesForHealth);
  const myHealth = healthMap.get(id) ?? null;
  const inviter = s.invitedByStudentId
    ? rosterRows.find((r) => r.id === s.invitedByStudentId)
    : null;
  const friends = (myHealth?.friendIds ?? [])
    .map((fid) => rosterRows.find((r) => r.id === fid))
    .filter((r): r is (typeof rosterRows)[number] => !!r);

  const studentTagRows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(studentTags)
    .innerJoin(tags, eq(tags.id, studentTags.tagId))
    .where(eq(studentTags.studentId, id));

  const allTagRows = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(tags);

  // Comments
  const commentRows = await db
    .select({
      id: studentComments.id,
      content: studentComments.content,
      createdAt: studentComments.createdAt,
      byName: users.displayName,
    })
    .from(studentComments)
    .leftJoin(users, eq(users.id, studentComments.userId))
    .where(eq(studentComments.studentId, id))
    .orderBy(asc(studentComments.createdAt));

  const currentUser = await getCurrentUser();

  async function update(formData: FormData) {
    "use server";
    const data = parseStudent(formData);
    await db.update(students).set({ ...data, updatedAt: new Date() }).where(eq(students.id, id));
    redirect(`/students/${id}`);
  }

  async function del() {
    "use server";
    await db.delete(students).where(eq(students.id, id));
    redirect("/students");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/students" className="text-sm text-black/60 hover:underline">← Students</Link>
          <h1 className="text-2xl font-semibold">
            {s.firstName} {s.lastName ?? ""}
          </h1>
        </div>
        <form action={del}>
          <button className="btn-ghost text-red-600" type="submit">Delete</button>
        </form>
      </div>

      <TagManager studentId={id} currentTags={studentTagRows} allTags={allTagRows} />

      <StudentForm action={update} student={s} roster={roster} />

      <NotesEditor studentId={id} initialValue={s.notes ?? ""} />

      {myHealth && (
        <section className="card space-y-2 border-accent/20">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">🪜 Health</h2>
            <span className="chip">{myHealth.inviterTier}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-wide text-black/50">Friends brought</div>
              <div className="text-2xl font-semibold tabular-nums">{myHealth.friendsBrought}</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-wide text-black/50">Last 30d</div>
              <div className="text-2xl font-semibold tabular-nums">{myHealth.recentAttendance}</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-wide text-black/50">Last 365d</div>
              <div className="text-2xl font-semibold tabular-nums">{myHealth.yearlyAttendance}</div>
            </div>
            <div className="rounded-lg border border-black/10 dark:border-white/10 p-2">
              <div className="text-[10px] uppercase tracking-wide text-black/50">Lifetime</div>
              <div className="text-2xl font-semibold tabular-nums">{myHealth.totalAttendance}</div>
            </div>
          </div>
          {inviter && (
            <p className="text-sm">
              <span className="text-black/60">Invited by:</span>{" "}
              <Link href={`/students/${inviter.id}`} className="hover:underline">
                {inviter.firstName}
                {inviter.lastName ? " " + inviter.lastName : ""}
              </Link>
            </p>
          )}
          {friends.length > 0 && (
            <div className="text-sm">
              <div className="text-black/60 mb-1">Brought ({friends.length}):</div>
              <ul className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <li key={f.id}>
                    <Link href={`/students/${f.id}`} className="chip hover:bg-black/10">
                      {f.firstName}
                      {f.lastName ? " " + f.lastName : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <DraftOutreach studentId={s.id} />

      <ActivityTimeline items={timelineItems} />

      <CommentsSection
        studentId={id}
        initialComments={commentRows.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          byName: c.byName,
        }))}
        currentUserId={currentUser?.id ?? 0}
      />
    </div>
  );
}
