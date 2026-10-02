import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { CalendarDays, CircleDollarSign, Users, ListChecks, Wallet } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { PerformancePanel } from "@/components/PerformancePanel";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useIsSuperAdmin } from "@/hooks/useBusiness";
import { formatCurrency, formatTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BookFlow" },
      { name: "description", content: "Today's appointments, revenue and customer activity at a glance." },
      { property: "og:title", content: "BookFlow dashboard" },
      { property: "og:description", content: "Track today's bookings and revenue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: business, isLoading } = useBusiness();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsSuperAdmin();

  useEffect(() => {
    if (adminLoading || isLoading) return;
    if (isAdmin) void navigate({ to: "/admin", replace: true });
    else if (!business) void navigate({ to: "/onboarding", replace: true });
  }, [isLoading, business, navigate, isAdmin, adminLoading]);

  const stats = useQuery({
    queryKey: ["dashboard", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      const monthStart = new Date(start.getFullYear(), start.getMonth(), 1);

      const [today, month, customers, upcoming] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, status, price")
          .eq("business_id", business!.id)
          .gte("starts_at", start.toISOString())
          .lt("starts_at", end.toISOString()),
        supabase
          .from("appointments")
          .select("price, status")
          .eq("business_id", business!.id)
          .gte("starts_at", monthStart.toISOString()),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business!.id),
        supabase
          .from("appointments")
          .select("id, starts_at, status, price, service:services(name), customer:customers(full_name), staff:staff(name)")
          .eq("business_id", business!.id)
          .gte("starts_at", start.toISOString())
          .order("starts_at")
          .limit(8),
      ]);

      const monthRevenue = (month.data ?? [])
        .filter((a) => a.status === "completed" || a.status === "confirmed")
        .reduce((sum, a) => sum + Number(a.price), 0);

      const todayRevenue = (today.data ?? [])
        .filter((a) => a.status === "completed" || a.status === "confirmed")
        .reduce((sum, a) => sum + Number(a.price), 0);

      return {
        todayCount: today.data?.length ?? 0,
        pendingCount: (today.data ?? []).filter((a) => a.status === "pending").length,
        monthRevenue,
        todayRevenue,
        customerCount: customers.count ?? 0,
        upcoming: upcoming.data ?? [],
      };
    },
  });

  return (
    <AppShell
      title="Dashboard"
      description={business ? `Here's how ${business.name} is doing today.` : "Loading your workspace…"}
      actions={
        business ? (
          <Button asChild size="sm">
            <Link to="/appointments">New booking</Link>
          </Button>
        ) : null
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Today's earnings"
          value={formatCurrency(stats.data?.todayRevenue ?? 0, business?.currency ?? "UGX")}
          icon={Wallet}
          tone="success"
        />
        <StatCard label="Today's appointments" value={stats.data?.todayCount ?? 0} icon={CalendarDays} tone="info" />
        <StatCard label="Awaiting confirmation" value={stats.data?.pendingCount ?? 0} icon={ListChecks} tone="warning" />
        <StatCard
          label="Revenue this month"
          value={formatCurrency(stats.data?.monthRevenue ?? 0, business?.currency ?? "UGX")}
          icon={CircleDollarSign}
        />
        <StatCard label="Customers" value={stats.data?.customerCount ?? 0} icon={Users} />
      </div>

      {business ? <PerformancePanel businessId={business.id} currency={business.currency} /> : null}

      <div className="surface-panel mt-6 p-4 sm:p-5">
        <h2 className="font-display text-lg font-semibold">Upcoming appointments</h2>
        {(stats.data?.upcoming.length ?? 0) === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Nothing booked yet"
            description="Share your booking link or add an appointment manually to get started."
          />
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {stats.data?.upcoming.map((appt) => (
              <li key={appt.id} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-20 text-sm font-medium">{formatTime(appt.starts_at)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {appt.customer?.full_name ?? "Walk-in"} · {appt.service?.name ?? "Service"}
                  </p>
                  <p className="text-xs text-muted-foreground">{appt.staff?.name ?? "Unassigned"}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(appt.price, business?.currency ?? "UGX")}
                </span>
                <StatusBadge status={appt.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
