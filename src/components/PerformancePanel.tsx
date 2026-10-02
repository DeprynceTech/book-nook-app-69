import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import { CalendarCheck, CircleDollarSign, TrendingUp, UserX } from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, toDateKey } from "@/lib/format";

type Preset = "today" | "7" | "week" | "30" | "month" | "custom";

const presets: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 days" },
  { value: "week", label: "This week" },
  { value: "30", label: "Last 30 days" },
  { value: "month", label: "Pick a month" },
  { value: "custom", label: "Custom dates" },
];

const EARNED = new Set(["completed", "confirmed"]);

function computeRange(preset: Preset, month: string, from: string, to: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  switch (preset) {
    case "today":
      return { start: today, end: addDays(today, 1) };
    case "7":
      return { start: addDays(today, -6), end: addDays(today, 1) };
    case "week": {
      const offset = (today.getDay() + 6) % 7; // Monday start
      const start = addDays(today, -offset);
      return { start, end: addDays(start, 7) };
    }
    case "month": {
      const [y, m] = month.split("-").map(Number);
      return { start: new Date(y!, m! - 1, 1), end: new Date(y!, m!, 1) };
    }
    case "custom": {
      const start = from ? new Date(`${from}T00:00:00`) : addDays(today, -29);
      const endDay = to ? new Date(`${to}T00:00:00`) : today;
      return { start, end: addDays(endDay < start ? start : endDay, 1) };
    }
    default:
      return { start: addDays(today, -29), end: addDays(today, 1) };
  }
}

const statusColors: Record<string, string> = {
  completed: "var(--color-success)",
  confirmed: "var(--color-primary)",
  pending: "var(--color-warning)",
  cancelled: "var(--color-muted-foreground)",
  no_show: "var(--color-destructive)",
  rescheduled: "var(--color-chart-2)",
};

const statusLabels: Record<string, string> = {
  completed: "Done",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  no_show: "Failed / no-show",
  rescheduled: "Rescheduled",
};

export function PerformancePanel({ businessId, currency }: { businessId: string; currency: string }) {
  const now = new Date();
  const [preset, setPreset] = useState<Preset>("30");
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { start, end } = useMemo(() => computeRange(preset, month, from, to), [preset, month, from, to]);

  const query = useQuery({
    queryKey: ["performance", businessId, start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("price, status, starts_at, service:services(name)")
        .eq("business_id", businessId)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString());
      return data ?? [];
    },
  });

  const view = useMemo(() => {
    const rows = query.data ?? [];
    const singleDay = end.getTime() - start.getTime() <= 86400000;
    const buckets = new Map<string, { label: string; earnings: number; bookings: number }>();

    if (singleDay) {
      for (let h = 6; h <= 22; h++) buckets.set(String(h), { label: `${h}:00`, earnings: 0, bookings: 0 });
    } else {
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        buckets.set(toDateKey(d), {
          label: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }),
          earnings: 0,
          bookings: 0,
        });
      }
    }

    const byStatus = new Map<string, number>();
    const byService = new Map<string, number>();
    let revenue = 0;
    let failed = 0;

    for (const r of rows) {
      const d = new Date(r.starts_at);
      const key = singleDay ? String(d.getHours()) : toDateKey(d);
      const b = buckets.get(key) ?? (singleDay ? { label: `${d.getHours()}:00`, earnings: 0, bookings: 0 } : undefined);
      const earned = EARNED.has(r.status) ? Number(r.price) : 0;
      if (b) {
        b.bookings += 1;
        b.earnings += earned;
        buckets.set(key, b);
      }
      revenue += earned;
      if (r.status === "no_show" || r.status === "cancelled") failed += 1;
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      const svc = r.service?.name ?? "Other";
      byService.set(svc, (byService.get(svc) ?? 0) + earned);
    }

    const series = singleDay
      ? [...buckets.entries()].sort((a, b) => Number(a[0]) - Number(b[0])).map(([, v]) => v)
      : [...buckets.values()];
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000));

    return {
      singleDay,
      series,
      revenue,
      total: rows.length,
      failed,
      avgPerDay: revenue / days,
      statuses: [...byStatus.entries()].map(([status, value]) => ({ status, name: statusLabels[status] ?? status, value })),
      services: [...byService.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, earnings]) => ({ name, earnings })),
    };
  }, [query.data, start, end]);

  const config = {
    earnings: { label: "Earnings", color: "var(--color-primary)" },
    bookings: { label: "Bookings", color: "var(--color-chart-2)" },
  } satisfies ChartConfig;

  const money = (v: number) => formatCurrency(v, currency);

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Performance</h2>
          <p className="text-sm text-muted-foreground">
            {start.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} –{" "}
            {new Date(end.getTime() - 1).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Select value={preset} onValueChange={(v) => setPreset(v as Preset)}>
              <SelectTrigger aria-label="Time period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {preset === "month" ? (
            <Input type="month" aria-label="Month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
          ) : null}
          {preset === "custom" ? (
            <>
              <Input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
              <Input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Earnings" value={money(view.revenue)} icon={CircleDollarSign} tone="success" />
        <StatCard label="Average per day" value={money(view.avgPerDay)} icon={TrendingUp} tone="info" />
        <StatCard label="Bookings" value={view.total} icon={CalendarCheck} />
        <StatCard label="Failed & cancelled" value={view.failed} icon={UserX} tone="destructive" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="surface-panel p-4 sm:p-5 lg:col-span-2">
          <h3 className="font-display text-base font-semibold">{view.singleDay ? "Earnings by hour" : "Daily earnings"}</h3>
          <ChartContainer config={config} className="mt-4 aspect-auto h-64 w-full">
            <AreaChart data={view.series} margin={{ left: 4, right: 8 }}>
              <defs>
                <linearGradient id="earnFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-earnings)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-earnings)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v) => Intl.NumberFormat("en", { notation: "compact" }).format(v)} />
              <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} />} />
              <Area dataKey="earnings" type="monotone" stroke="var(--color-earnings)" fill="url(#earnFill)" strokeWidth={2} />
            </AreaChart>
          </ChartContainer>
        </div>

        <div className="surface-panel p-4 sm:p-5">
          <h3 className="font-display text-base font-semibold">Booking outcomes</h3>
          {view.statuses.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No bookings in this period.</p>
          ) : (
            <>
              <ChartContainer config={{}} className="mx-auto mt-2 aspect-square h-48">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                  <Pie data={view.statuses} dataKey="value" nameKey="name" innerRadius={45} strokeWidth={2}>
                    {view.statuses.map((s) => (
                      <Cell key={s.status} fill={statusColors[s.status] ?? "var(--color-chart-3)"} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <ul className="mt-2 space-y-1 text-sm">
                {view.statuses.map((s) => (
                  <li key={s.status} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: statusColors[s.status] }} />
                      {s.name}
                    </span>
                    <span className="text-muted-foreground">{s.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="surface-panel p-4 sm:p-5 lg:col-span-2">
          <h3 className="font-display text-base font-semibold">Bookings over time</h3>
          <ChartContainer config={config} className="mt-4 aspect-auto h-56 w-full">
            <BarChart data={view.series}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} />
              <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="bookings" fill="var(--color-bookings)" radius={4} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="surface-panel p-4 sm:p-5">
          <h3 className="font-display text-base font-semibold">Top earning services</h3>
          {view.services.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No earnings yet.</p>
          ) : (
            <ChartContainer config={config} className="mt-4 aspect-auto h-56 w-full">
              <BarChart data={view.services} layout="vertical" margin={{ left: 0, right: 8 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => money(Number(v))} />} />
                <Bar dataKey="earnings" fill="var(--color-earnings)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </section>
  );
}
