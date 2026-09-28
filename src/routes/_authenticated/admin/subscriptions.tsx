import { createFileRoute } from "@tanstack/react-router";
import { Coins, TrendingUp, Wallet } from "lucide-react";

import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminData } from "@/lib/admin-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { AdminHeading } from "./route";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  head: () => ({
    meta: [
      { title: "Subscriptions & revenue — BookFlow Control" },
      { name: "description", content: "Revenue generated from BookFlow subscriptions, by plan and payment." },
      { property: "og:title", content: "Subscriptions & revenue" },
      { property: "og:description", content: "Platform subscription revenue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Subscriptions,
});

function Subscriptions() {
  const { data } = useAdminData();
  const cur = data?.currency ?? "UGX";
  const rows = data?.rows ?? [];
  const nameById = new Map(rows.map((r) => [r.id, r.name]));

  const byPlan = (data?.plans ?? []).map((plan) => {
    const members = rows.filter((r) => r.plan?.id === plan.id);
    const paying = members.filter((r) => r.state === "subscribed").length;
    return {
      plan,
      paying,
      trial: members.filter((r) => r.state === "trial").length,
      mrr: paying * Number(plan.price_monthly),
      collected: members.reduce((s, r) => s + r.paid, 0),
    };
  });

  return (
    <>
      <AdminHeading title="Subscriptions & revenue" description="Money generated from business subscriptions." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Monthly recurring revenue" value={formatCurrency(data?.mrr ?? 0, cur)} icon={TrendingUp} tone="info" />
        <StatCard label="Collected this month" value={formatCurrency(data?.thisMonth ?? 0, cur)} icon={Wallet} />
        <StatCard label="Total collected (all time)" value={formatCurrency(data?.totalCollected ?? 0, cur)} icon={Coins} tone="success" />
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Revenue by plan</h2>
      <div className="surface-panel mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Plan</th>
              <th className="p-3">Price</th>
              <th className="p-3">Paying</th>
              <th className="p-3">On trial</th>
              <th className="p-3 text-right">Monthly revenue</th>
              <th className="p-3 text-right">Collected</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {byPlan.map((p) => (
              <tr key={p.plan.id}>
                <td className="p-3 font-medium">{p.plan.name}</td>
                <td className="p-3">{formatCurrency(p.plan.price_monthly, p.plan.currency)}/mo</td>
                <td className="p-3">{p.paying}</td>
                <td className="p-3">{p.trial}</td>
                <td className="p-3 text-right">{formatCurrency(p.mrr, cur)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(p.collected, cur)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Payment history</h2>
      {(data?.payments.length ?? 0) === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No subscription payments recorded yet.</p>
      ) : (
        <div className="surface-panel mt-3 divide-y divide-border">
          {data?.payments.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{nameById.get(p.business_id) ?? "Unknown business"}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(p.paid_at ?? p.created_at)} · {p.provider}{p.method ? ` · ${p.method}` : ""}
                </p>
              </div>
              <StatusBadge status={p.status} />
              <p className="w-32 text-right text-sm font-semibold">{formatCurrency(p.amount, p.currency)}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
