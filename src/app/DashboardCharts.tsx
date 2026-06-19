"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7"];

type OverTime = { name: string; date: string; count: number; eventId: number }[];
type Funnel = { stage: string; count: number }[];
type Breakdowns = {
  year: { name: string; value: number }[];
  gender: { name: string; value: number }[];
  eventType: { name: string; value: number }[];
};

export default function DashboardCharts({
  overTime, funnel, breakdowns,
}: { overTime: OverTime; funnel: Funnel; breakdowns: Breakdowns }) {
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const minAllowed = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const filteredOverTime = overTime.filter((d) => {
    const t = new Date(d.date).getTime();
    return t >= new Date(startDate).getTime() && t <= new Date(endDate + "T23:59:59").getTime();
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-bold mb-2">Attendance over time</h3>
        <div className="flex items-center gap-2 mb-2 text-xs text-black/60 dark:text-white/60">
          <label>From <input type="date" value={startDate} min={minAllowed} max={endDate}
            className="input py-0.5 px-1 text-xs w-32"
            onChange={e => setStartDate(e.target.value)} /></label>
          <label>To <input type="date" value={endDate} min={startDate} max={new Date().toISOString().slice(0,10)}
            className="input py-0.5 px-1 text-xs w-32"
            onChange={e => setEndDate(e.target.value)} /></label>
        </div>
        {filteredOverTime.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={filteredOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold mb-2">Engagement funnel</h3>
        {funnel.every((f) => f.count === 0) ? <Empty /> : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
              <XAxis type="number" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" fontSize={11} width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#7c3aed" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card lg:col-span-2">
        <h3 className="font-bold mb-2">Breakdowns</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PieMini title="By year" data={breakdowns.year} />
          <PieMini title="By gender" data={breakdowns.gender} />
          <PieMini title="By event type" data={breakdowns.eventType} />
        </div>
      </div>
    </div>
  );
}

function PieMini({ title, data }: { title: string; data: { name: string; value: number }[] }) {
  return (
    <div>
      <div className="text-xs text-black/60 dark:text-white/60 text-center mb-1">{title}</div>
      {data.length === 0 ? <Empty /> : (
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={60} label>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function Empty() {
  return <div className="h-[200px] flex items-center justify-center text-xs text-black/40 dark:text-white/40">no data yet</div>;
}
