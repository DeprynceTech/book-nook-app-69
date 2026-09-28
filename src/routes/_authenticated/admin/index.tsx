import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, Building2, CalendarDays, Clock, Coins, TrendingUp, Users, XCircle } from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminData } from "@/lib/admin-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminHeading } from "./route";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Platform overview — BookFlow Control" },
      { name: "description", content: "Subscriptions, revenue and activity across every BookFlow business." },
      { property: "og:title", content: "BookFlow Control" },
      { property: "og:description", content: "Platform administration overview." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { data } = useAdminData();
  const rows = data?.rows ?? [];
  const cur = data?.currency ?? "UGX";
  const count = (s: string) => rows.filter((r) => r.state === s).length;

  return (
    <>
      <AdminHeading title="Platform overview" description="How BookFlow is doing across every business." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Monthly recurring revenue" value={formatCurrency(data?.mrr ?? 0, cur)} icon={TrendingUp} tone="info" />
        <StatCard label="Collected this month" value={formatCurrency(data?.thisMonth ?? 0, cur)} icon={Coins} />
        <StatCard label="Total collected" value={formatCurrency(data?.totalCollected ?? 0, cur)} icon={Coins} />
        <StatCard label="Businesses" value={rows.length} icon={Building2} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Subscribed (paying)" value={count("subscribed")} icon={BadgeCheck} tone="success" />
        <StatCard label="On free trial" value={count("trial")} icon={Clock} tone="warning" />
        <StatCard label="Not subscribed" value={count("unsubscribed")} icon={XCircle} tone="destructive" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Appointments booked" value={data?.appointmentCount ?? 0} icon={CalendarDays} />
        <StatCard label="End customers" value={data?.customerCount ?? 0} icon={Users} />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Newest businesses</h2>
        <Link to="/admin/businesses" className="text-sm font-medium text-primary hover:underline">See all</Link>
      </div>
      <div className="surface-panel mt-3 divide-y divide-border">
        {rows.slice(0, 6).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.plan?.name ?? "No plan"} · joined {formatDate(r.created_at)}
              </p>
            </div>
            <StatusBadge status={r.sub?.status ?? "expired"} />
          </div>
        ))}
      </div>
    </>
  );
}
