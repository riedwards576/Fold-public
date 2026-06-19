"use client";

import Link from "next/link";

type TimelineItem =
  | { type: "attendance"; date: string; eventId: number; eventName: string }
  | { type: "contact"; date: string; channel: string; channelDetail: string | null; responded: boolean; notes: string | null; byName: string | null };

type Props = { items: TimelineItem[] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ChannelLabel({ channel }: { channel: string }) {
  const labels: Record<string, string> = {
    ig_dm: "Instagram DM",
    text: "Text",
    phone: "Phone call",
    email: "Email",
    in_person: "In person",
    other: "Other",
  };
  return <>{labels[channel] ?? channel}</>;
}

export default function ActivityTimeline({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="card">
        <h2 className="font-semibold mb-2">Activity</h2>
        <p className="text-sm text-black/50 dark:text-white/50">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Activity ({items.length})</h2>
      <ol className="relative border-l border-black/10 dark:border-white/10 space-y-0">
        {items.map((item, i) => (
          <li key={i} className="ml-4 pb-5 last:pb-0">
            {/* Dot */}
            <span className="absolute -left-[7px] flex h-3.5 w-3.5 items-center justify-center rounded-full border border-black/20 dark:border-white/20 bg-white dark:bg-zinc-900 text-[10px] leading-none">
              {item.type === "attendance" ? "📅" : "📞"}
            </span>

            <div className="ml-2">
              <p className="text-xs text-black/50 dark:text-white/50 mb-0.5">
                {formatDate(item.date)}
              </p>

              {item.type === "attendance" ? (
                <p className="text-sm">
                  Attended{" "}
                  <Link
                    href={`/events/${item.eventId}`}
                    className="font-medium hover:underline"
                  >
                    {item.eventName}
                  </Link>
                </p>
              ) : (
                <div className="text-sm space-y-0.5">
                  <p>
                    <ChannelLabel channel={item.channel} />
                    {item.channelDetail && (
                      <span className="text-black/50 dark:text-white/50">
                        {" "}· {item.channelDetail}
                      </span>
                    )}
                    {item.responded && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
                        Responded
                      </span>
                    )}
                  </p>
                  {item.notes && (
                    <p className="text-black/60 dark:text-white/60 text-xs">{item.notes}</p>
                  )}
                  {item.byName && (
                    <p className="text-black/40 dark:text-white/40 text-xs">by {item.byName}</p>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
