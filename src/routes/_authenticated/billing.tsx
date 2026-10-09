import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useSubscription } from "@/hooks/useBusiness";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing — BookFlow" },
      { name: "description", content: "View your current plan, trial status and switch to a plan that fits your team." },
      { property: "og:title", content: "Billing" },
      { property: "og:description", content: "Manage your BookFlow subscription." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

function BillingPage() {
  const { data: business } = useBusiness();
  const { data: subscription } = useSubscription(business?.id);
  const queryClient = useQueryClient();

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  const payments = useQuery({
    queryKey: ["payments", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const changePlan = useMutation({
    mutationFn: async (planId: string) => {
      if (!subscription) throw new Error("No subscription found");
      const { error } = await supabase.from("subscriptions").update({ plan_id: planId }).eq("id", subscription.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan updated.");
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
    onError: () => toast.error("Could not change your plan."),
  });

  return (
    <AppShell title="Billing" description="Your plan and payment history.">
      <div className="surface-panel p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current plan</p>
            <p className="mt-1 font-display text-xl font-semibold">{subscription?.plan?.name ?? "No plan"}</p>
          </div>
          {subscription ? <StatusBadge status={subscription.status} /> : null}
        </div>
        {subscription ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {subscription.status === "trialing" && subscription.trial_ends_at
              ? `Free trial ends ${formatDate(subscription.trial_ends_at)}.`
              : `Renews ${formatDate(subscription.current_period_end)}.`}
          </p>
        ) : null}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Available plans</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.data?.map((plan) => {
          const current = subscription?.plan_id === plan.id;
          return (
            <div key={plan.id} className="surface-panel flex flex-col p-4">
              <p className="font-display text-lg font-semibold">{plan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
              <p className="mt-3 font-display text-xl font-semibold">
                {Number(plan.price_monthly) === 0 ? "Free" : formatCurrency(plan.price_monthly, plan.currency)}
              </p>
              <ul className="mt-3 flex-1 space-y-1.5 text-xs text-muted-foreground">
                <li className="flex gap-1.5">
                  <Check className="size-3.5 shrink-0 text-success" />
                  {plan.max_staff === null ? "Unlimited staff" : `${plan.max_staff} staff`}
                </li>
                <li className="flex gap-1.5">
                  <Check className="size-3.5 shrink-0 text-success" />
                  {plan.max_locations} location{plan.max_locations === 1 ? "" : "s"}
                </li>
                <li className="flex gap-1.5">
                  <Check className="size-3.5 shrink-0 text-success" />
                  {plan.sms_enabled ? "SMS reminders" : "Email reminders"}
                </li>
              </ul>
              <Button
                className="mt-4"
                variant={current ? "outline" : "default"}
                disabled={current || changePlan.isPending}
                onClick={() => changePlan.mutate(plan.id)}
              >
                {current ? "Current plan" : "Switch to this plan"}
              </Button>
            </div>
          );
        })}
      </div>

      <h2 className="mt-8 font-display text-lg font-semibold">Payment history</h2>
      {(payments.data?.length ?? 0) === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No payments recorded yet.</p>
      ) : (
        <div className="surface-panel mt-4 divide-y divide-border">
          {payments.data?.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between gap-3 p-4 text-sm">
              <div>
                <p className="font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(payment.created_at)} · {payment.provider}
                </p>
              </div>
              <StatusBadge status={payment.status} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
