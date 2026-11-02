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
    return { provider: this.name, status: "skipped", error: "No delivery provider connected yet" };
  }
}

/**
 * Klaviyo via the connector gateway. Each message is recorded as a Klaviyo
 * event (metric e.g. "BookFlow Email booking_confirmation"); a Klaviyo flow
 * triggered by that metric performs the actual email/SMS delivery using the
 * event properties (subject, body, business, ...).
 */
const METRIC_LABEL: Record<Channel, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp" };

class KlaviyoProvider implements NotificationProvider {
  name = "klaviyo";
  private fallback: LoggingProvider;
  constructor(public channel: Channel) {
    this.fallback = new LoggingProvider(`internal-${channel}`, channel);
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const klaviyoKey = process.env["KLAVIYO_API_KEY"];
    if (!lovableKey || !klaviyoKey) return this.fallback.send(message);

    const profile: Record<string, string> = {};
    if (message.channel === "email") {
      profile["email"] = message.recipient.trim();
    } else {
      const phone = message.recipient.replace(/[^\d+]/g, "");
      if (!phone.startsWith("+")) {
        return { provider: this.name, status: "failed", error: "Phone must include country code (+...)" };
      }
      profile["phone_number"] = phone;
    }

    const res = await fetch("https://connector-gateway.lovable.dev/klaviyo/events/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": klaviyoKey,
        revision: "2026-07-15",
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type: "event",
          attributes: {
            properties: {
              subject: message.subject ?? "",
              body: message.body,
              notification_type: message.type,
              channel: message.channel,
              business_id: message.businessId,
              appointment_id: message.appointmentId ?? null,
            },
            metric: {
              data: {
                type: "metric",
                attributes: { name: `BookFlow ${METRIC_LABEL[message.channel]} ${message.type}` },
              },
            },
            profile: { data: { type: "profile", attributes: profile } },
            unique_id: `${message.appointmentId ?? crypto.randomUUID()}-${message.type}-${message.channel}`,
          },
        },
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`Klaviyo send failed [${res.status}]: ${text}`);
      return { provider: this.name, status: "failed", error: `[${res.status}] ${text.slice(0, 300)}` };
    }
    return { provider: this.name, status: "sent" };
  }
}

const registry = new Map<Channel, NotificationProvider>([
  ["email", new KlaviyoProvider("email")],
  ["sms", new KlaviyoProvider("sms")],
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
