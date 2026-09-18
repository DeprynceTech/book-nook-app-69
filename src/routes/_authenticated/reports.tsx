import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarCheck, CircleDollarSign, TrendingUp, UserX } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — BookFlow" },
      { name: "description", content: "Track revenue, booking volume, no-shows and your best-selling services." },
      { property: "og:title", content: "Reports" },
      { property: "og:description", content: "Revenue and booking performance for your business." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReportsPage,
});

const ranges = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function ReportsPage() {
  const { data: business } = useBusiness();
  const [range, setRange] = useState("30");

  const report = useQuery({
    queryKey: ["reports", business?.id, range],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - Number(range));

      const { data } = await supabase
        .from("appointments")
        .select("price, status, starts_at, service:services(name)")
        .eq("business_id", business!.id)
        .gte("starts_at", since.toISOString());

      const rows = data ?? [];
      const revenue = rows
        .filter((r) => r.status === "completed" || r.status === "confirmed")
        .reduce((sum, r) => sum + Number(r.price), 0);
      const noShows = rows.filter((r) => r.status === "no_show").length;
      const cancelled = rows.filter((r) => r.status === "cancelled").length;

      const byService = new Map<string, { count: number; revenue: number }>();
      for (const row of rows) {
        const key = row.service?.name ?? "Other";
        const entry = byService.get(key) ?? { count: 0, revenue: 0 };
        entry.count += 1;
        if (row.status === "completed" || row.status === "confirmed") entry.revenue += Number(row.price);
        byService.set(key, entry);
      }

      const byHour = new Array(24).fill(0) as number[];
      for (const row of rows) byHour[new Date(row.starts_at).getHours()] += 1;
      const peakHour = byHour.indexOf(Math.max(...byHour));

      return {
        total: rows.length,
        revenue,
        noShows,
        cancelled,
        peakHour: rows.length > 0 ? peakHour : null,
        services: [...byService.entries()].sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 8),
      };
    },
  });

  const currency = business?.currency ?? "UGX";

  return (
    <AppShell
      title="Reports"
      description="How your business is performing."
      actions={
        <div className="w-40">
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bookings" value={report.data?.total ?? 0} icon={CalendarCheck} tone="info" />
        <StatCard
          label="Revenue"
          value={formatCurrency(report.data?.revenue ?? 0, currency)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="No-shows & cancellations"
          value={(report.data?.noShows ?? 0) + (report.data?.cancelled ?? 0)}
          icon={UserX}
          tone="destructive"
        />
        <StatCard
          label="Busiest hour"
          value={report.data?.peakHour === null || report.data?.peakHour === undefined ? "—" : `${report.data.peakHour}:00`}
          icon={TrendingUp}
        />
      </div>

      <div className="surface-panel mt-6 p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold">Top services</h2>
        {(report.data?.services.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No bookings in this period yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {report.data?.services.map(([name, stats]) => (
              <li key={name} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 truncate font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {stats.count} booking{stats.count === 1 ? "" : "s"} · {formatCurrency(stats.revenue, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
