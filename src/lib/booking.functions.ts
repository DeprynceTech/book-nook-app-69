import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { generateSlots, hasConflict } from "@/lib/booking";
import type { BusyInterval, WorkingHour } from "@/lib/booking";

const availabilitySchema = z.object({
  slug: z.string().min(1).max(120),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const bookingSchema = z.object({
  slug: z.string().min(1).max(120),
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable().optional(),
  startsAt: z.string().datetime(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(5).max(40),
  customerEmail: z.string().email().max(160).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

const waitlistSchema = z.object({
  slug: z.string().min(1).max(120),
  serviceId: z.string().uuid(),
  customerName: z.string().min(2).max(120),
  customerPhone: z.string().min(5).max(40),
  customerEmail: z.string().email().max(160).optional().or(z.literal("")),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().or(z.literal("")),
});

async function loadContext(slug: string, serviceId: string, staffId?: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug, timezone, currency, is_published, is_suspended, email, phone")
    .eq("slug", slug)
    .maybeSingle();

  if (!business || !business.is_published || business.is_suspended) {
    throw new Error("This booking page is not available.");
  }

  const { data: service } = await supabaseAdmin
    .from("services")
    .select("id, name, price, duration_minutes, buffer_minutes, location_id, is_active, business_id")
    .eq("id", serviceId)
    .eq("business_id", business.id)
    .maybeSingle();

  if (!service || !service.is_active) throw new Error("That service is no longer bookable.");

  if (staffId) {
    const { data: staff } = await supabaseAdmin
      .from("staff")
      .select("id")
      .eq("id", staffId)
      .eq("business_id", business.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) throw new Error("That team member is not available.");
  }

  return { supabaseAdmin, business, service };
}

export const getAvailability = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => availabilitySchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, business, service } = await loadContext(data.slug, data.serviceId, data.staffId);

    const dayStart = new Date(`${data.date}T00:00:00`);
    const dayEnd = new Date(`${data.date}T23:59:59`);

    const [hoursRes, holidayRes, apptRes] = await Promise.all([
      supabaseAdmin
        .from("working_hours")
        .select("day_of_week, is_open, open_time, close_time, break_start, break_end, staff_id")
        .eq("business_id", business.id),
      supabaseAdmin.from("holidays").select("date").eq("business_id", business.id).eq("date", data.date),
      supabaseAdmin
        .from("appointments")
        .select("starts_at, ends_at, staff_id, status")
        .eq("business_id", business.id)
        .gte("starts_at", dayStart.toISOString())
        .lte("starts_at", dayEnd.toISOString()),
    ]);

    const allHours = (hoursRes.data ?? []) as WorkingHour[];
    const staffHours = data.staffId ? allHours.filter((h) => h.staff_id === data.staffId) : [];
    const workingHours = staffHours.length > 0 ? staffHours : allHours.filter((h) => !h.staff_id);

    const busy: BusyInterval[] = (apptRes.data ?? [])
      .filter((a) => a.status !== "cancelled" && (!data.staffId || a.staff_id === data.staffId))
      .map((a) => ({ start: new Date(a.starts_at).getTime(), end: new Date(a.ends_at).getTime() }));

    const slots = generateSlots({
      date: data.date,
      workingHours,
      durationMinutes: service.duration_minutes,
      bufferMinutes: service.buffer_minutes,
      busy,
      holidays: (holidayRes.data ?? []).map((h) => h.date),
    });

    return { slots, durationMinutes: service.duration_minutes, currency: business.currency };
  });

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, business, service } = await loadContext(data.slug, data.serviceId, data.staffId);

    const start = new Date(data.startsAt).getTime();
    if (Number.isNaN(start) || start < Date.now()) throw new Error("Please pick a future time slot.");
    const end = start + service.duration_minutes * 60_000;
    const guardStart = new Date(start - 4 * 3_600_000).toISOString();
    const guardEnd = new Date(end + 4 * 3_600_000).toISOString();

    // Re-verify the slot immediately before writing to prevent double booking.
    const { data: existing } = await supabaseAdmin
      .from("appointments")
      .select("starts_at, ends_at, staff_id, status")
      .eq("business_id", business.id)
      .gte("starts_at", guardStart)
      .lte("starts_at", guardEnd);

    const busy: BusyInterval[] = (existing ?? [])
      .filter((a) => a.status !== "cancelled" && (!data.staffId || a.staff_id === data.staffId))
      .map((a) => ({ start: new Date(a.starts_at).getTime(), end: new Date(a.ends_at).getTime() }));

    if (hasConflict({ start, end }, busy)) {
      throw new Error("Sorry, that slot was just taken. Please choose another time.");
    }

    const phone = data.customerPhone.trim();
    const { data: matched } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("business_id", business.id)
      .eq("phone", phone)
      .maybeSingle();

    let customerId = matched?.id ?? null;
    if (!customerId) {
      const { data: created, error } = await supabaseAdmin
        .from("customers")
        .insert({
          business_id: business.id,
          full_name: data.customerName.trim(),
          phone,
          email: data.customerEmail || null,
        })
        .select("id")
        .single();
      if (error) throw new Error("Could not save your details. Please try again.");
      customerId = created.id;
    }

    const { data: appointment, error: apptError } = await supabaseAdmin
      .from("appointments")
      .insert({
        business_id: business.id,
        location_id: service.location_id,
        customer_id: customerId,
        service_id: service.id,
        staff_id: data.staffId ?? null,
        starts_at: new Date(start).toISOString(),
        ends_at: new Date(end).toISOString(),
        price: service.price,
        status: "pending",
        payment_status: "unpaid",
        source: "public_booking",
        notes: data.notes || null,
      })
      .select("id, starts_at, ends_at")
      .single();

    if (apptError) throw new Error("Could not create the appointment. Please try again.");

    const [staffResult, locationResult] = await Promise.all([
      data.staffId
        ? supabaseAdmin.from("staff").select("name").eq("id", data.staffId).eq("business_id", business.id).maybeSingle()
        : Promise.resolve({ data: null }),
      service.location_id
        ? supabaseAdmin.from("locations").select("name").eq("id", service.location_id).eq("business_id", business.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { sendNotification, renderTemplate } = await import("@/lib/notifications.server");
    const vars = {
      customer: data.customerName,
      business: business.name,
      service: service.name,
      datetime: new Date(start).toUTCString(),
      booking_url: `/book/${business.slug}`,
    };
    const body = renderTemplate(
      "Hi {{customer}}, your {{service}} at {{business}} is booked for {{datetime}}.",
      vars,
    );

    if (data.customerEmail) {
      await sendNotification({
        businessId: business.id,
        appointmentId: appointment.id,
        channel: "email",
        type: "booking_confirmation",
        recipient: data.customerEmail,
        subject: `Your booking at ${business.name}`,
        body,
      });
    }
    await sendNotification({
      businessId: business.id,
      appointmentId: appointment.id,
      channel: "sms",
      type: "booking_confirmation",
      recipient: phone,
      body,
    });

    return {
      id: appointment.id,
      startsAt: appointment.starts_at,
      endsAt: appointment.ends_at,
      businessName: business.name,
      serviceName: service.name,
      price: service.price,
      currency: business.currency,
      customerName: data.customerName.trim(),
      customerPhone: phone,
      customerEmail: data.customerEmail || null,
      staffName: staffResult.data?.name ?? null,
      locationName: locationResult.data?.name ?? null,
      paymentStatus: "unpaid",
      businessPhone: business.phone,
      businessEmail: business.email,
    };
  });

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => waitlistSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin, business, service } = await loadContext(data.slug, data.serviceId);
    const { error } = await supabaseAdmin.from("waitlist").insert({
      business_id: business.id,
      service_id: service.id,
      customer_name: data.customerName.trim(),
      customer_phone: data.customerPhone.trim(),
      customer_email: data.customerEmail || null,
      preferred_date: data.preferredDate,
      notes: data.notes || null,
    });
    if (error) throw new Error("Could not join the waitlist. Please try again.");
    return { ok: true };
  });

const pageSchema = z.object({ slug: z.string().min(1).max(120) });

/** Public, read-only payload that powers the booking page. */
export const getBookingPage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => pageSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: business } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, name, slug, description, category, city, country, currency, timezone, phone, email, brand_color, logo_url, cover_url, is_published, is_suspended, cancellation_hours",
      )
      .eq("slug", data.slug)
      .maybeSingle();

    if (!business || !business.is_published || business.is_suspended) return null;

    const [servicesRes, staffRes, staffServicesRes, locationsRes] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, name, description, category, price, duration_minutes, location_id")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name"),
      supabaseAdmin
        .from("staff")
        .select("id, name, role, photo_url, bio")
        .eq("business_id", business.id)
        .eq("is_active", true)
        .order("name"),
      supabaseAdmin.from("staff_services").select("staff_id, service_id").eq("business_id", business.id),
      supabaseAdmin
        .from("locations")
        .select("id, name, address, city")
        .eq("business_id", business.id)
        .eq("is_active", true),
    ]);

    const resolveBrandingUrl = async (value: string | null) => {
      if (!value || /^https?:\/\//.test(value)) return value;
      const { data: signed } = await supabaseAdmin.storage.from("business-branding").createSignedUrl(value, 3600);
      return signed?.signedUrl ?? null;
    };

    const [logoUrl, coverUrl] = await Promise.all([
      resolveBrandingUrl(business.logo_url),
      resolveBrandingUrl(business.cover_url),
    ]);

    return {
      business: { ...business, logo_url: logoUrl, cover_url: coverUrl },
      services: servicesRes.data ?? [],
      staff: staffRes.data ?? [],
      staffServices: staffServicesRes.data ?? [],
      locations: locationsRes.data ?? [],
    };
  });
