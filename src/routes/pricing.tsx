import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Simple Monthly Plans | BookFlow" },
      {
        name: "description",
        content:
          "Transparent BookFlow pricing. Start with a 14-day free trial, then choose a plan that matches your team size, locations and reminder channels.",
      },
      { property: "og:title", content: "BookFlow pricing" },
      { property: "og:description", content: "Monthly plans for solo professionals up to multi-location teams." },
    ],
  }),
  component: PricingPage,
});

function limitLabel(value: number | null, noun: string) {
  return value === null ? `Unlimited ${noun}` : `Up to ${value} ${noun}`;
}

function PricingPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["public-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      return data ?? [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Pricing</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Every plan includes your booking page, calendar, customer records and email reminders.
          All plans start with a 14-day free trial.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading plans…</p>
        ) : (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {(plans ?? []).map((plan) => (
              <div key={plan.id} className="flex flex-col rounded-xl border border-border bg-card/40 p-6">
                <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
                <p className="mt-1 min-h-10 text-sm text-muted-foreground">{plan.description}</p>
                <p className="mt-4 font-display text-3xl font-bold">
                  {Number(plan.price_monthly) === 0 ? "Free" : formatCurrency(plan.price_monthly, plan.currency)}
                  {Number(plan.price_monthly) > 0 ? (
                    <span className="text-sm font-medium text-muted-foreground"> /month</span>
                  ) : null}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                  {[
                    limitLabel(plan.max_staff, "staff"),
                    limitLabel(plan.max_appointments, "bookings / month"),
                    limitLabel(plan.max_customers, "customers"),
                    `${plan.max_locations} location${plan.max_locations === 1 ? "" : "s"}`,
                    plan.sms_enabled ? "SMS reminders" : "Email reminders",
                    ...(plan.whatsapp_enabled ? ["WhatsApp reminders"] : []),
                    ...(plan.analytics_enabled ? ["Advanced reports"] : []),
                    ...(plan.custom_branding ? ["Custom branding"] : []),
                    ...(plan.api_access ? ["API access"] : []),
                  ].map((line) => (
                    <li key={line} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />
                      {line}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6">
                  <Link to="/auth" search={{ mode: "register" }}>
                    Start free trial
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
