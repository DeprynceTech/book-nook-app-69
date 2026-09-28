import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type SubState = "subscribed" | "trial" | "unsubscribed";

export function subState(status: string | null | undefined): SubState {
  if (status === "active") return "subscribed";
  if (status === "trialing") return "trial";
  return "unsubscribed";
}

export function useAdminData(enabled = true) {
  return useQuery({
    queryKey: ["admin-data"],
    enabled,
    queryFn: async () => {
      const [businesses, subs, plans, payments, tickets, appts, customers] = await Promise.all([
        supabase
          .from("businesses")
          .select("id, name, slug, category, city, email, phone, currency, is_published, is_suspended, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
        supabase.from("subscription_plans").select("*").order("sort_order"),
        supabase.from("payments").select("*").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
      ]);
      const planById = new Map((plans.data ?? []).map((p) => [p.id, p]));
      const subByBiz = new Map<string, NonNullable<typeof subs.data>[number]>();
      for (const s of subs.data ?? []) if (!subByBiz.has(s.business_id)) subByBiz.set(s.business_id, s);

      const rows = (businesses.data ?? []).map((b) => {
        const sub = subByBiz.get(b.id) ?? null;
        const plan = sub ? planById.get(sub.plan_id) ?? null : null;
        const paid = (payments.data ?? [])
          .filter((p) => p.business_id === b.id && p.status === "successful")
          .reduce((sum, p) => sum + Number(p.amount), 0);
        return { ...b, sub, plan, state: subState(sub?.status), paid };
      });

      const successful = (payments.data ?? []).filter((p) => p.status === "successful");
      const totalCollected = successful.reduce((s, p) => s + Number(p.amount), 0);
      const mrr = rows
        .filter((r) => r.state === "subscribed")
        .reduce((s, r) => s + Number(r.plan?.price_monthly ?? 0), 0);
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonth = successful
        .filter((p) => new Date(p.paid_at ?? p.created_at) >= monthStart)
        .reduce((s, p) => s + Number(p.amount), 0);

      return {
        rows,
        plans: plans.data ?? [],
        payments: payments.data ?? [],
        tickets: tickets.data ?? [],
        appointmentCount: appts.count ?? 0,
        customerCount: customers.count ?? 0,
        totalCollected,
        mrr,
        thisMonth,
        currency: plans.data?.[0]?.currency ?? "UGX",
      };
    },
  });
}
