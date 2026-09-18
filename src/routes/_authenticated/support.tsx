import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({
    meta: [
      { title: "Support — BookFlow" },
      { name: "description", content: "Send the BookFlow team a message and track the status of your requests." },
      { property: "og:title", content: "Support" },
      { property: "og:description", content: "Get help with your BookFlow workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();

  const tickets = useQuery({
    queryKey: ["tickets", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("support_tickets").insert({
        business_id: business?.id ?? null,
        subject: String(form.get("subject")).trim(),
        message: String(form.get("message")).trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Message sent. We'll get back to you soon.");
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: () => toast.error("Could not send your message."),
  });

  return (
    <AppShell title="Support" description="We're here to help.">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="surface-panel space-y-4 p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            e.currentTarget.reset();
            create.mutate(form);
          }}
        >
          <h2 className="font-display text-lg font-semibold">Send a message</h2>
          <div className="space-y-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="message">How can we help?</Label>
            <Textarea id="message" name="message" rows={6} required />
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Sending…" : "Send message"}
          </Button>
        </form>

        <div className="surface-panel p-4 sm:p-5">
          <h2 className="font-display text-lg font-semibold">Your requests</h2>
          {(tickets.data?.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">You haven't contacted us yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {tickets.data?.map((ticket) => (
                <li key={ticket.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-medium">{ticket.subject}</p>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{ticket.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(ticket.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
