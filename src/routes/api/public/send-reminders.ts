import { createFileRoute } from "@tanstack/react-router";

import { renderTemplate, sendNotification, type Channel } from "@/lib/notifications.server";

/**
 * Reminder dispatcher. Call on a schedule (e.g. every 15 minutes) with
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * For each published business it looks at the reminder_hours configured in
 * settings and sends a reminder for every confirmed/pending appointment that
 * falls inside the matching window, skipping any already logged.
 */

const WINDOW_MINUTES = 30;

async function run() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: businesses } = await supabaseAdmin
    .from("businesses")
    .select("id, name, reminder_hours, is_published, is_suspended")
    .eq("is_published", true)
    .eq("is_suspended", false);

  let sent = 0;
  const now = Date.now();

  for (const business of businesses ?? []) {
    const hours = (business.reminder_hours ?? []) as number[];
    if (hours.length === 0) continue;

    const { data: templates } = await supabaseAdmin
      .from("notification_templates")
      .select("channel, subject, body, is_active")
      .or(`business_id.eq.${business.id},business_id.is.null`)
      .eq("type", "reminder")
      .eq("is_active", true);

    for (const hour of hours) {
      const from = new Date(now + hour * 3_600_000).toISOString();
      const to = new Date(now + hour * 3_600_000 + WINDOW_MINUTES * 60_000).toISOString();

      const { data: appointments } = await supabaseAdmin
        .from("appointments")
        .select("id, starts_at, business_id, customer:customers(full_name, email, phone), service:services(name)")
        .eq("business_id", business.id)
        .in("status", ["pending", "confirmed"])
        .gte("starts_at", from)
        .lt("starts_at", to);

      for (const appointment of appointments ?? []) {
        const { data: already } = await supabaseAdmin
          .from("notification_logs")
          .select("id")
          .eq("appointment_id", appointment.id)
          .eq("type", "reminder")
          .eq("status", "sent")
          .limit(1)
          .maybeSingle();
        if (already) continue;

        const customer = appointment.customer as { full_name?: string; email?: string; phone?: string } | null;
        const service = appointment.service as { name?: string } | null;
        if (!customer) continue;

        const vars = {
          customer_name: customer.full_name ?? "there",
          business_name: business.name,
          service_name: service?.name ?? "your appointment",
          starts_at: new Date(appointment.starts_at).toLocaleString(),
        };

        const fallback =
          "Hi {{customer_name}}, this is a reminder for {{service_name}} with {{business_name}} on {{starts_at}}.";

        for (const channel of ["email", "sms", "whatsapp"] as Channel[]) {
          const recipient = channel === "email" ? customer.email : customer.phone;
          if (!recipient) continue;

          const template = (templates ?? []).find((t) => t.channel === channel);
          if (!template && channel !== "email") continue;

          const result = await sendNotification({
            businessId: business.id,
            appointmentId: appointment.id,
            channel,
            type: "reminder",
            recipient,
            subject: renderTemplate(template?.subject ?? "Appointment reminder", vars),
            body: renderTemplate(template?.body ?? fallback, vars),
          });
          if (result.status === "sent") sent += 1;
          break; // one channel per appointment
        }
      }
    }
  }

  return sent;
}

export const Route = createFileRoute("/api/public/send-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
          return new Response("Unauthorized", { status: 401 });
        }
        const sent = await run();
        return Response.json({ ok: true, sent });
      },
    },
  },
});
