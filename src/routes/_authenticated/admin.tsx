import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, CalendarDays, ShieldAlert, Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "@/hooks/useBusiness";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Platform admin — BookFlow" },
      { name: "description", content: "Platform-wide overview of businesses, subscriptions and support requests." },
      { property: "og:title", content: "Platform admin" },
      { property: "og:description", content: "Manage every business on the platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useIsSuperAdmin();
  const queryClient = useQueryClient();

  const overview = useQuery({
    queryKey: ["admin-overview"],
    enabled: isAdmin === true,
    queryFn: async () => {
      const [businesses, appointments, customers, tickets] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, category, city, is_published, is_suspended, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase
          .from("support_tickets")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      return {
        businesses: businesses.data ?? [],
        appointmentCount: appointments.count ?? 0,
        customerCount: customers.count ?? 0,
        tickets: tickets.data ?? [],
      };
    },
  });

  const suspend = useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const { error } = await supabase.from("businesses").update({ is_suspended: suspended }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: () => toast.error("Could not update that business."),
  });

  if (isLoading) {
    return (
      <AppShell title="Platform admin" description="Checking your access…">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell title="Platform admin" description="Restricted area">
        <div className="surface-panel flex flex-col items-center gap-3 p-10 text-center">
          <ShieldAlert className="size-10 text-muted-foreground" />
          <h2 className="font-display text-lg font-semibold">You don't have access</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            This area is only available to platform administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Platform admin" description="Every business on BookFlow.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Businesses" value={overview.data?.businesses.length ?? 0} icon={Building2} tone="info" />
        <StatCard label="Appointments" value={overview.data?.appointmentCount ?? 0} icon={CalendarDays} />
        <StatCard label="Customers" value={overview.data?.customerCount ?? 0} icon={Users} />
        <StatCard
          label="Suspended"
          value={(overview.data?.businesses ?? []).filter((b) => b.is_suspended).length}
          icon={ShieldAlert}
          tone="destructive"
        />
      </div>

      <div className="surface-panel mt-6 divide-y divide-border">
        {overview.data?.businesses.map((biz) => (
          <div key={biz.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{biz.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                /book/{biz.slug} · {biz.category}
                {biz.city ? ` · ${biz.city}` : ""} · joined {formatDate(biz.created_at)}
              </p>
            </div>
            <StatusBadge status={biz.is_suspended ? "expired" : biz.is_published ? "active" : "unpaid"} />
            <Button
              size="sm"
              variant={biz.is_suspended ? "outline" : "ghost"}
              onClick={() => suspend.mutate({ id: biz.id, suspended: !biz.is_suspended })}
            >
              {biz.is_suspended ? "Reinstate" : "Suspend"}
            </Button>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Recent support requests</h2>
      {(overview.data?.tickets.length ?? 0) === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No support requests.</p>
      ) : (
        <div className="surface-panel mt-4 divide-y divide-border">
          {overview.data?.tickets.map((ticket) => (
            <div key={ticket.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{ticket.subject}</p>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
