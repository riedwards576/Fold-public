"use client";

import { useState } from "react";

type Props = {
  count: number;
  busy: boolean;
  onApply: (patch: Record<string, unknown>) => void;
  onClose: () => void;
};

const COURSE_OPTIONS = [
  "Orientation",
  "Study Group 101",
  "Community Bootcamp",
  "Leadership Track",
];

type BoolVal = true | false | null;

export default function BulkEditModal({ count, busy, onApply, onClose }: Props) {
  // Row enabled state
  const [enableIsActive, setEnableIsActive] = useState(false);
  const [enableContactedViaIg, setEnableContactedViaIg] = useState(false);
  const [enableGender, setEnableGender] = useState(false);
  const [enableYear, setEnableYear] = useState(false);
  const [enableFunnelStage, setEnableFunnelStage] = useState(false);
  const [enableMemberStatus, setEnableMemberStatus] = useState(false);
  const [enablePrimaryContact, setEnablePrimaryContact] = useState(false);
  const [enableGoals, setEnableGoals] = useState(false);
  const [enableNotes, setEnableNotes] = useState(false);
  const [enableCourseMaterial, setEnableCourseMaterial] = useState(false);

  // Field values
  const [isActive, setIsActive] = useState<BoolVal>(true);
  const [contactedViaIg, setContactedViaIg] = useState<BoolVal>(true);
  const [gender, setGender] = useState("");
  const [year, setYear] = useState("");
  const [funnelStage, setFunnelStage] = useState("");
  const [memberStatus, setMemberStatus] = useState("");
  const [primaryContact, setPrimaryContact] = useState("");
  const [goals, setGoals] = useState("");
  const [notes, setNotes] = useState("");
  const [courseMaterial, setCourseMaterial] = useState<Set<string>>(new Set());

  function toggleCourse(course: string) {
    setCourseMaterial((prev) => {
      const next = new Set(prev);
      if (next.has(course)) next.delete(course);
      else next.add(course);
      return next;
    });
  }

  function handleApply() {
    const patch: Record<string, unknown> = {};
    if (enableIsActive && isActive !== null) patch.isActive = isActive;
    if (enableContactedViaIg && contactedViaIg !== null) patch.contactedViaIg = contactedViaIg;
    if (enableGender && gender !== "") patch.gender = gender;
    if (enableYear && year !== "") patch.year = year;
    if (enableFunnelStage && funnelStage !== "") patch.funnelStage = funnelStage;
    if (enableMemberStatus && memberStatus !== "") patch.memberStatus = memberStatus;
    if (enablePrimaryContact && primaryContact.trim() !== "") patch.primaryContact = primaryContact.trim();
    if (enableGoals && goals.trim() !== "") patch.goals = goals.trim();
    if (enableNotes && notes.trim() !== "") patch.notes = notes.trim();
    if (enableCourseMaterial) patch.courseMaterial = Array.from(courseMaterial);
    onApply(patch);
  }

  const hasAnyEnabled =
    enableIsActive ||
    enableContactedViaIg ||
    enableGender ||
    enableYear ||
    enableFunnelStage ||
    enableMemberStatus ||
    enablePrimaryContact ||
    enableGoals ||
    enableNotes ||
    enableCourseMaterial;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 mx-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Edit {count} student{count !== 1 ? "s" : ""}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost p-1 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white text-lg leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p className="text-sm text-black/50 dark:text-white/50">
          Only checked fields will be updated.
        </p>

        <div className="space-y-3">
          {/* isActive */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-isActive"
              checked={enableIsActive}
              onChange={(e) => {
                setEnableIsActive(e.target.checked);
                if (e.target.checked && isActive === null) setIsActive(true);
              }}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-isActive" className="label w-32 cursor-pointer select-none">
              Status
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!enableIsActive || busy}
                onClick={() => setIsActive(true)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  enableIsActive && isActive === true
                    ? "bg-emerald-600 border-emerald-600 text-white"
                    : "border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                disabled={!enableIsActive || busy}
                onClick={() => setIsActive(false)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  enableIsActive && isActive === false
                    ? "bg-zinc-600 border-zinc-600 text-white"
                    : "border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* contactedViaIg */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-contactedViaIg"
              checked={enableContactedViaIg}
              onChange={(e) => {
                setEnableContactedViaIg(e.target.checked);
                if (e.target.checked && contactedViaIg === null) setContactedViaIg(true);
              }}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-contactedViaIg" className="label w-32 cursor-pointer select-none">
              Contacted via IG
            </label>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={!enableContactedViaIg || busy}
                onClick={() => setContactedViaIg(true)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  enableContactedViaIg && contactedViaIg === true
                    ? "bg-accent border-accent text-white"
                    : "border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                disabled={!enableContactedViaIg || busy}
                onClick={() => setContactedViaIg(false)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  enableContactedViaIg && contactedViaIg === false
                    ? "bg-zinc-600 border-zinc-600 text-white"
                    : "border-black/20 dark:border-white/20 text-black/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {/* gender */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-gender"
              checked={enableGender}
              onChange={(e) => setEnableGender(e.target.checked)}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-gender" className="label w-32 cursor-pointer select-none">
              Gender
            </label>
            <select
              className="input text-sm py-1 disabled:opacity-40"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              disabled={!enableGender || busy}
            >
              <option value="">— no change —</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>

          {/* year */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-year"
              checked={enableYear}
              onChange={(e) => setEnableYear(e.target.checked)}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-year" className="label w-32 cursor-pointer select-none">
              Year
            </label>
            <select
              className="input text-sm py-1 disabled:opacity-40"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={!enableYear || busy}
            >
              <option value="">— no change —</option>
              <option value="freshman">Freshman</option>
              <option value="sophomore">Sophomore</option>
              <option value="junior">Junior</option>
              <option value="senior">Senior</option>
              <option value="grad">Grad</option>
              <option value="postgrad">PostGrad</option>
            </select>
          </div>

          {/* funnelStage */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-funnelStage"
              checked={enableFunnelStage}
              onChange={(e) => setEnableFunnelStage(e.target.checked)}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-funnelStage" className="label w-32 cursor-pointer select-none">
              Stage
            </label>
            <select
              className="input text-sm py-1 disabled:opacity-40"
              value={funnelStage}
              onChange={(e) => setFunnelStage(e.target.value)}
              disabled={!enableFunnelStage || busy}
            >
              <option value="">— no change —</option>
              <option value="new">New</option>
              <option value="reaching_out">Reaching out</option>
              <option value="connected">Connected</option>
              <option value="met">Met</option>
              <option value="active">Active</option>
              <option value="engaged">Engaged</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* memberStatus */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-memberStatus"
              checked={enableMemberStatus}
              onChange={(e) => setEnableMemberStatus(e.target.checked)}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-memberStatus" className="label w-32 cursor-pointer select-none">
              Member status
            </label>
            <select
              className="input text-sm py-1 disabled:opacity-40"
              value={memberStatus}
              onChange={(e) => setMemberStatus(e.target.value)}
              disabled={!enableMemberStatus || busy}
            >
              <option value="">— no change —</option>
              <option value="prospect">Prospect</option>
              <option value="member">Member</option>
              <option value="core">Core</option>
            </select>
          </div>

          {/* primaryContact */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enable-primaryContact"
              checked={enablePrimaryContact}
              onChange={(e) => setEnablePrimaryContact(e.target.checked)}
              className="cursor-pointer flex-shrink-0"
            />
            <label htmlFor="enable-primaryContact" className="label w-32 cursor-pointer select-none">
              Primary contact
            </label>
            <input
              type="text"
              className="input text-sm py-1 flex-1 disabled:opacity-40"
              placeholder="Contact name…"
              value={primaryContact}
              onChange={(e) => setPrimaryContact(e.target.value)}
              disabled={!enablePrimaryContact || busy}
            />
          </div>

          {/* goals */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="enable-goals"
              checked={enableGoals}
              onChange={(e) => setEnableGoals(e.target.checked)}
              className="cursor-pointer flex-shrink-0 mt-1"
            />
            <label htmlFor="enable-goals" className="label w-32 cursor-pointer select-none mt-1">
              Goals
            </label>
            <textarea
              className="input text-sm py-1 flex-1 min-h-[60px] resize-y disabled:opacity-40"
              placeholder="Goals…"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              disabled={!enableGoals || busy}
            />
          </div>

          {/* notes */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="enable-notes"
              checked={enableNotes}
              onChange={(e) => setEnableNotes(e.target.checked)}
              className="cursor-pointer flex-shrink-0 mt-1"
            />
            <label htmlFor="enable-notes" className="label w-32 cursor-pointer select-none mt-1">
              Notes
            </label>
            <textarea
              className="input text-sm py-1 flex-1 min-h-[60px] resize-y disabled:opacity-40"
              placeholder="Notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!enableNotes || busy}
            />
          </div>

          {/* courseMaterial */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="enable-courseMaterial"
              checked={enableCourseMaterial}
              onChange={(e) => setEnableCourseMaterial(e.target.checked)}
              className="cursor-pointer flex-shrink-0 mt-1"
            />
            <label htmlFor="enable-courseMaterial" className="label w-32 cursor-pointer select-none mt-1">
              Course material
            </label>
            <div className="flex flex-col gap-1.5">
              {COURSE_OPTIONS.map((course) => (
                <label
                  key={course}
                  className={`flex items-center gap-2 text-sm cursor-pointer select-none ${
                    !enableCourseMaterial ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={courseMaterial.has(course)}
                    onChange={() => toggleCourse(course)}
                    disabled={!enableCourseMaterial || busy}
                    className="cursor-pointer"
                  />
                  {course}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-black/10 dark:border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-ghost disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy || !hasAnyEnabled}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Applying…" : `Apply to ${count} student${count !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
