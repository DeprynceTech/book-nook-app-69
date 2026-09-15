import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { formatTime, toDateKey } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar — BookFlow" },
      { name: "description", content: "A week-by-week view of every appointment across your team." },
      { property: "og:title", content: "Calendar" },
      { property: "og:description", content: "See your week of appointments at a glance." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CalendarPage,
});

function startOfWeek(date: Date) {
  const d = new Date(date);
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function CalendarPage() {
  const { data: business } = useBusiness();
  const [anchor, setAnchor] = useState(() => startOfWeek(new Date()));

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(anchor.getDate() + i);
        return d;
      }),
    [anchor],
  );

  const weekEnd = useMemo(() => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    return d;
  }, [anchor]);

  const appointments = useQuery({
    queryKey: ["calendar", business?.id, anchor.toISOString()],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("appointments")
        .select("id, starts_at, status, service:services(name), customer:customers(full_name), staff:staff(name)")
        .eq("business_id", business!.id)
        .gte("starts_at", anchor.toISOString())
        .lt("starts_at", weekEnd.toISOString())
        .order("starts_at");
      return data ?? [];
    },
  });

  function shift(weeks: number) {
    const next = new Date(anchor);
    next.setDate(next.getDate() + weeks * 7);
    setAnchor(next);
  }

  return (
    <AppShell
      title="Calendar"
      description={`Week of ${anchor.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
      actions={
        <div className="flex items-center gap-1">
          <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Previous week">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setAnchor(startOfWeek(new Date()))}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Next week">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-7">
        {days.map((day) => {
          const key = toDateKey(day);
          const items = (appointments.data ?? []).filter((a) => toDateKey(new Date(a.starts_at)) === key);
          const isToday = key === toDateKey(new Date());
          return (
            <div key={key} className="surface-panel min-h-40 p-3">
              <p className={isToday ? "text-sm font-semibold text-primary" : "text-sm font-semibold"}>
                {day.toLocaleDateString("en-GB", { weekday: "short" })} {day.getDate()}
              </p>
              <div className="mt-2 space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bookings</p>
                ) : (
                  items.map((appt) => (
                    <div key={appt.id} className="rounded-lg border border-border p-2">
                      <p className="text-xs font-medium">{formatTime(appt.starts_at)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appt.customer?.full_name ?? "Walk-in"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{appt.service?.name}</p>
                      <StatusBadge status={appt.status} className="mt-1" />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
