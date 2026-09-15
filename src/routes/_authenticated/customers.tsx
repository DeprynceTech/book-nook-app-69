import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { formatDate, initials } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({
    meta: [
      { title: "Customers — BookFlow" },
      { name: "description", content: "Search your client list, view contact details and keep private visit notes." },
      { property: "og:title", content: "Customers" },
      { property: "og:description", content: "Your full client list with contact details and notes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const customers = useQuery({
    queryKey: ["customers", business?.id, search],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      let query = supabase
        .from("customers")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (search.trim()) query = query.ilike("full_name", `%${search.trim()}%`);
      const { data } = await query;
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("customers").insert({
        business_id: business!.id,
        full_name: String(form.get("full_name")).trim(),
        phone: String(form.get("phone") ?? "").trim() || null,
        email: String(form.get("email") ?? "").trim() || null,
        notes: String(form.get("notes") ?? "").trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Customer added.");
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: () => toast.error("Could not save that customer."),
  });

  return (
    <AppShell
      title="Customers"
      description="Everyone who has booked with you."
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Add customer</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add customer</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" name="full_name" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Saving…" : "Save customer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <Input
        placeholder="Search by name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 max-w-sm"
      />

      {(customers.data?.length ?? 0) === 0 ? (
        <EmptyState icon={Users} title="No customers yet" description="They'll appear here after the first booking." />
      ) : (
        <div className="surface-panel divide-y divide-border">
          {customers.data?.map((customer) => (
            <div key={customer.id} className="flex items-center gap-3 p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {initials(customer.full_name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{customer.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ") || "No contact details"}
                </p>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Since {formatDate(customer.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
