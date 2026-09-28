import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAdminData, type SubState } from "@/lib/admin-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AdminHeading } from "./route";

export const Route = createFileRoute("/_authenticated/admin/businesses")({
  head: () => ({
    meta: [
      { title: "Businesses — BookFlow Control" },
      { name: "description", content: "Every business on BookFlow with its subscription status." },
      { property: "og:title", content: "Businesses — BookFlow Control" },
      { property: "og:description", content: "Manage businesses on the platform." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Businesses,
});

const filters: { key: "all" | SubState; label: string }[] = [
  { key: "all", label: "All" },
  { key: "subscribed", label: "Subscribed" },
  { key: "trial", label: "On trial" },
  { key: "unsubscribed", label: "Not subscribed" },
];

function Businesses() {
  const { data } = useAdminData();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | SubState>("all");
  const [q, setQ] = useState("");

  const suspend = useMutation({
    mutationFn: async ({ id, suspended }: { id: string; suspended: boolean }) => {
      const { error } = await supabase.from("businesses").update({ is_suspended: suspended }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Business updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-data"] });
    },
    onError: () => toast.error("Could not update that business."),
  });

  const rows = (data?.rows ?? []).filter(
    (r) => (filter === "all" || r.state === filter) && r.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <>
      <AdminHeading title="Businesses" description="See who has subscribed, who is on trial and who hasn't paid." />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border border-border px-3 py-1.5 text-sm",
              filter === f.key ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {f.label} ({f.key === "all" ? data?.rows.length ?? 0 : (data?.rows ?? []).filter((r) => r.state === f.key).length})
          </button>
        ))}
        <Input placeholder="Search businesses…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
      </div>

      <div className="surface-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Business</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Subscription</th>
              <th className="p-3">Renews / trial ends</th>
              <th className="p-3 text-right">Paid to date</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.category}{r.city ? ` · ${r.city}` : ""}{r.is_suspended ? " · suspended" : ""}
                  </p>
                </td>
                <td className="p-3">{r.plan ? `${r.plan.name} · ${formatCurrency(r.plan.price_monthly, r.plan.currency)}/mo` : "—"}</td>
                <td className="p-3"><StatusBadge status={r.sub?.status ?? "expired"} /></td>
                <td className="p-3 text-muted-foreground">
                  {r.sub ? formatDate(r.sub.status === "trialing" && r.sub.trial_ends_at ? r.sub.trial_ends_at : r.sub.current_period_end) : "—"}
                </td>
                <td className="p-3 text-right font-medium">{formatCurrency(r.paid, data?.currency)}</td>
                <td className="p-3 text-right">
                  <Button
                    size="sm"
                    variant={r.is_suspended ? "outline" : "ghost"}
                    onClick={() => suspend.mutate({ id: r.id, suspended: !r.is_suspended })}
                  >
                    {r.is_suspended ? "Reinstate" : "Suspend"}
                  </Button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No businesses match.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
