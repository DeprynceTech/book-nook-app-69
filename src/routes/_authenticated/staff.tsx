import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { UserSquare2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [
      { title: "Team — BookFlow" },
      { name: "description", content: "Add team members, set their roles and control who appears on your booking page." },
      { property: "og:title", content: "Team members" },
      { property: "og:description", content: "Manage the people who take your appointments." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const staff = useQuery({
    queryKey: ["staff", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase.from("staff").select("*").eq("business_id", business!.id).order("name");
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("staff").insert({
        business_id: business!.id,
        name: String(form.get("name")).trim(),
        role: String(form.get("role") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        phone: String(form.get("phone") ?? "").trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Team member added.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: () => toast.error("Could not save that team member."),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("staff").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["staff"] }),
    onError: () => toast.error("Could not update that team member."),
  });

  const services = useQuery({
    queryKey: ["services-min", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name")
        .eq("business_id", business!.id)
        .eq("is_active", true)
        .order("name");
      return data ?? [];
    },
  });

  const links = useQuery({
    queryKey: ["staff-services", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("staff_services")
        .select("id, staff_id, service_id")
        .eq("business_id", business!.id);
      return data ?? [];
    },
  });

  const toggleService = useMutation({
    mutationFn: async ({ staffId, serviceId, on }: { staffId: string; serviceId: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("staff_services")
          .insert({ business_id: business!.id, staff_id: staffId, service_id: serviceId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("staff_services")
          .delete()
          .eq("staff_id", staffId)
          .eq("service_id", serviceId);
        if (error) throw error;
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["staff-services"] }),
    onError: () => toast.error("Could not update services for that team member."),
  });


  return (
    <AppShell
      title="Team"
      description="People who deliver your services."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add team member</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add team member</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role">Job title</Label>
                <Input id="role" name="role" placeholder="Stylist, therapist, consultant…" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save team member"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {(staff.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="No team members yet"
          description="Add yourself or your staff so bookings can be assigned."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staff.data?.map((member) => {
            const mine = new Set(
              (links.data ?? []).filter((l) => l.staff_id === member.id).map((l) => l.service_id),
            );
            return (
              <div key={member.id} className="surface-panel space-y-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {member.role ?? "Team member"}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </p>
                  </div>
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={(checked) => toggle.mutate({ id: member.id, isActive: checked })}
                    aria-label="Accepting bookings"
                  />
                </div>
                {(services.data?.length ?? 0) > 0 ? (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Services clients can book with {member.name.split(" ")[0]}
                      {mine.size === 0 ? " (none picked = all services)" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {services.data?.map((s) => {
                        const on = mine.has(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            disabled={toggleService.isPending}
                            onClick={() => toggleService.mutate({ staffId: member.id, serviceId: s.id, on: !on })}
                            className={
                              on
                                ? "rounded-full border border-primary bg-primary/10 px-2.5 py-1 text-xs text-primary"
                                : "rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground"
                            }
                          >
                            {s.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
