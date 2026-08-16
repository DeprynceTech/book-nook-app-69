/**
 * Notification engine — provider-agnostic.
 *
 * Appointment event -> NotificationService -> Email / SMS / WhatsApp provider.
 * Providers are registered here so a real vendor (Resend, Twilio, Meta WhatsApp
 * Cloud API, Africa's Talking, ...) can be dropped in without touching the
 * appointment code. Every send is logged to notification_logs.
 */

export type Channel = "email" | "sms" | "whatsapp";

export type NotificationType =
  | "booking_confirmation"
  | "reminder"
  | "cancellation"
  | "reschedule"
  | "followup";

export type NotificationMessage = {
  businessId: string;
  appointmentId?: string | null;
  channel: Channel;
  type: NotificationType;
  recipient: string;
  subject?: string;
  body: string;
};

export type SendResult = { provider: string; status: "sent" | "failed" | "skipped"; error?: string };

export interface NotificationProvider {
  name: string;
  channel: Channel;
  send(message: NotificationMessage): Promise<SendResult>;
}

/**
 * Default providers queue the message and log it. Swap these for real vendors by
 * registering a provider with the same channel — no appointment code changes.
 */
class LoggingProvider implements NotificationProvider {
  constructor(
    public name: string,
    public channel: Channel,
  ) {}

  async send(message: NotificationMessage): Promise<SendResult> {
    console.info(`[notifications:${this.channel}] -> ${message.recipient}: ${message.body}`);
    return { provider: this.name, status: "sent" };
  }
}

const registry = new Map<Channel, NotificationProvider>([
  ["email", new LoggingProvider("internal-email", "email")],
  ["sms", new LoggingProvider("internal-sms", "sms")],
  ["whatsapp", new LoggingProvider("internal-whatsapp", "whatsapp")],
]);

export function registerProvider(provider: NotificationProvider) {
  registry.set(provider.channel, provider);
}

export function renderTemplate(template: string, vars: Record<string, string>) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, key: string) => vars[key] ?? "");
}

export async function sendNotification(message: NotificationMessage): Promise<SendResult> {
  const provider = registry.get(message.channel);
  let result: SendResult;

  if (!provider) {
    result = { provider: "none", status: "skipped", error: `No provider for ${message.channel}` };
  } else {
    try {
      result = await provider.send(message);
    } catch (error) {
      result = {
        provider: provider.name,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("notification_logs").insert({
      business_id: message.businessId,
      appointment_id: message.appointmentId ?? null,
      recipient: message.recipient,
      type: message.type,
      channel: message.channel,
      provider: result.provider,
      status: result.status,
      error_message: result.error ?? null,
      sent_at: result.status === "sent" ? new Date().toISOString() : null,
    });
  } catch (error) {
    console.error("Failed to log notification", error);
  }

  return result;
}
