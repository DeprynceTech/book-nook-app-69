import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { formatCurrency, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/appointments")({
  head: () => ({
    meta: [
      { title: "Appointments — BookFlow" },
      { name: "description", content: "Review, confirm, complete and cancel every appointment in one list." },
      { property: "og:title", content: "Appointments" },
      { property: "og:description", content: "Manage all bookings for your business." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppointmentsPage,
});

const statuses = ["all", "pending", "confirmed", "completed", "cancelled", "no_show"] as const;

function AppointmentsPage() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof statuses)[number]>("all");
  const [open, setOpen] = useState(false);

  const appointments = useQuery({
    queryKey: ["appointments", business?.id, filter],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      let query = supabase
        .from("appointments")
        .select("*, service:services(name), customer:customers(full_name, phone), staff:staff(name)")
        .eq("business_id", business!.id)
        .order("starts_at", { ascending: false })
        .limit(100);
      if (filter !== "all") query = query.eq("status", filter);
      const { data } = await query;
      return data ?? [];
    },
  });

  const services = useQuery({
    queryKey: ["services-min", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, price, duration_minutes")
        .eq("business_id", business!.id)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const staff = useQuery({
    queryKey: ["staff-min", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", business!.id)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("appointments")
        .update({ status: status as "confirmed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Appointment updated.");
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: () => toast.error("Could not update that appointment."),
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const serviceId = String(form.get("serviceId"));
      const service = services.data?.find((s) => s.id === serviceId);
      if (!service) throw new Error("Pick a service");
      const startsAt = new Date(String(form.get("startsAt")));
      const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60_000);
      const staffValue = String(form.get("staffId") ?? "");
      const fullName = String(form.get("customerName")).trim();
      const phone = String(form.get("customerPhone")).trim();

      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("business_id", business!.id)
        .eq("phone", phone)
        .maybeSingle();

      let customerId = existing?.id;
      if (!customerId) {
        const { data: created, error } = await supabase
          .from("customers")
          .insert({ business_id: business!.id, full_name: fullName, phone })
          .select("id")
          .single();
        if (error) throw error;
        customerId = created.id;
      }

      const { error: apptError } = await supabase.from("appointments").insert({
        business_id: business!.id,
        customer_id: customerId,
        service_id: serviceId,
        staff_id: staffValue || null,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        price: service.price,
        status: "confirmed",
        source: "manual",
      });
      if (apptError) throw apptError;
    },
    onSuccess: () => {
      toast.success("Appointment added.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save."),
  });

  return (
    <AppShell
      title="Appointments"
      description="Every booking, newest first."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">New booking</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New appointment</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Customer name</Label>
                <Input id="customerName" name="customerName" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerPhone">Phone</Label>
                <Input id="customerPhone" name="customerPhone" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceId">Service</Label>
                <select
                  id="serviceId"
                  name="serviceId"
                  required
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {services.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staffId">Team member</Label>
                <select
                  id="staffId"
                  name="staffId"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Unassigned</option>
                  {staff.data?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startsAt">Starts at</Label>
                <Input id="startsAt" name="startsAt" type="datetime-local" required />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save appointment"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="mb-4 w-48">
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                {s === "all" ? "All statuses" : s === "no_show" ? "Failed / no-show" : s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(appointments.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments" description="Bookings will appear here." />
      ) : (
        <div className="surface-panel divide-y divide-border">
          {appointments.data?.map((appt) => (
            <div key={appt.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {appt.customer?.full_name ?? "Walk-in"} · {appt.service?.name ?? "Service"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(appt.starts_at)} · {appt.staff?.name ?? "Unassigned"}
                </p>
              </div>
              <span className="text-sm">{formatCurrency(appt.price, business?.currency ?? "UGX")}</span>
              <StatusBadge status={appt.status} />
              <div className="flex gap-1.5">
                {appt.status === "pending" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: appt.id, status: "confirmed" })}>
                    Confirm
                  </Button>
                ) : null}
                {appt.status === "confirmed" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: appt.id, status: "completed" })}>
                    Mark done
                  </Button>
                ) : null}
                {appt.status === "pending" || appt.status === "confirmed" ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: appt.id, status: "no_show" })}>
                    Mark failed
                  </Button>
                ) : null}
                {appt.status === "pending" || appt.status === "confirmed" ? (
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ id: appt.id, status: "cancelled" })}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
