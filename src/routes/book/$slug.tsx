import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAvailability, createPublicBooking, getBookingPage } from "@/lib/booking.functions";
import { formatCurrency, formatDate, formatTime, toDateKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/book/$slug")({
  ssr: false,
  head: ({ params }) => ({
    meta: [
      { title: `Book an appointment — ${params.slug} | BookFlow` },
      {
        name: "description",
        content: "Choose a service, pick a time that suits you and confirm your appointment online in under a minute.",
      },
      { property: "og:title", content: "Book an appointment" },
      { property: "og:description", content: "Pick a service and time, and confirm your booking online." },
    ],
  }),
  component: BookingPage,
});

function nextDays(count: number) {
  const out: Date[] = [];
  const base = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    out.push(d);
  }
  return out;
}

function BookingPage() {
  const { slug } = Route.useParams();
  const loadPage = useServerFn(getBookingPage);
  const loadSlots = useServerFn(getAvailability);
  const book = useServerFn(createPublicBooking);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [date, setDate] = useState(() => toDateKey(new Date()));
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<{ startsAt: string } | null>(null);

  const page = useQuery({
    queryKey: ["booking-page", slug],
    queryFn: () => loadPage({ data: { slug } }),
  });

  const service = useMemo(
    () => page.data?.services.find((s) => s.id === serviceId) ?? null,
    [page.data, serviceId],
  );

  const eligibleStaff = useMemo(() => {
    if (!page.data || !serviceId) return [];
    const links = page.data.staffServices.filter((l) => l.service_id === serviceId);
    if (links.length === 0) return page.data.staff;
    const ids = new Set(links.map((l) => l.staff_id));
    return page.data.staff.filter((s) => ids.has(s.id));
  }, [page.data, serviceId]);

  const availability = useQuery({
    queryKey: ["availability", slug, serviceId, staffId, date],
    enabled: Boolean(serviceId),
    queryFn: () => loadSlots({ data: { slug, serviceId: serviceId!, staffId, date } }),
  });

  const confirm = useMutation({
    mutationFn: async () =>
      book({
        data: {
          slug,
          serviceId: serviceId!,
          staffId,
          startsAt: slot!,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          notes: notes.trim(),
        },
      }),
    onSuccess: () => {
      setConfirmed({ startsAt: slot! });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Booking failed. Please try another time.");
      void availability.refetch();
    },
  });

  if (page.isLoading) {
    return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!page.data) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div>
          <h1 className="font-display text-2xl font-semibold">Booking page unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This business is not taking online bookings right now.
          </p>
        </div>
      </div>
    );
  }

  const { business, locations } = page.data;

  if (confirmed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto size-12 text-success" />
          <h1 className="mt-4 font-display text-2xl font-semibold">Booking requested</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {business.name} will confirm shortly. We've saved your details.
          </p>
          <div className="mt-5 rounded-xl bg-secondary p-4 text-left text-sm">
            <p className="font-medium">{service?.name}</p>
            <p className="mt-1 text-muted-foreground">
              {formatDate(confirmed.startsAt)} at {formatTime(confirmed.startsAt)}
            </p>
            {service ? (
              <p className="mt-1 text-muted-foreground">
                {service.duration_minutes} min · {formatCurrency(service.price, business.currency)}
              </p>
            ) : null}
          </div>
          {business.phone ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Need to change it? Call {business.phone}.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="border-b border-border bg-card/50">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{business.name}</h1>
          {business.description ? (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{business.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {business.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" /> {business.city}
                {business.country ? `, ${business.country}` : ""}
              </span>
            ) : null}
            {business.phone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3.5" /> {business.phone}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
        <section>
          <h2 className="font-display text-lg font-semibold">1. Choose a service</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {page.data.services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setServiceId(s.id);
                  setStaffId(null);
                  setSlot(null);
                }}
                className={cn(
                  "rounded-xl border border-border p-4 text-left transition-colors hover:border-primary",
                  serviceId === s.id && "border-primary bg-primary/5",
                )}
              >
                <p className="font-medium">{s.name}</p>
                {s.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.description}</p>
                ) : null}
                <p className="mt-2 text-sm text-muted-foreground">
                  <Clock className="mr-1 inline size-3.5" />
                  {s.duration_minutes} min · {formatCurrency(s.price, business.currency)}
                </p>
              </button>
            ))}
          </div>
        </section>

        {serviceId ? (
          <section>
            <h2 className="font-display text-lg font-semibold">2. Choose a team member</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setStaffId(null);
                  setSlot(null);
                }}
                className={cn(
                  "rounded-full border border-border px-4 py-2 text-sm",
                  staffId === null && "border-primary bg-primary/5",
                )}
              >
                First available
              </button>
              {eligibleStaff.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setStaffId(member.id);
                    setSlot(null);
                  }}
                  className={cn(
                    "rounded-full border border-border px-4 py-2 text-sm",
                    staffId === member.id && "border-primary bg-primary/5",
                  )}
                >
                  {member.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {serviceId ? (
          <section>
            <h2 className="font-display text-lg font-semibold">3. Pick a date and time</h2>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
              {nextDays(14).map((d) => {
                const key = toDateKey(d);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDate(key);
                      setSlot(null);
                    }}
                    className={cn(
                      "min-w-16 shrink-0 rounded-xl border border-border px-3 py-2 text-center text-xs",
                      date === key && "border-primary bg-primary/5",
                    )}
                  >
                    <span className="block text-muted-foreground">
                      {d.toLocaleDateString("en-GB", { weekday: "short" })}
                    </span>
                    <span className="mt-0.5 block text-base font-semibold">{d.getDate()}</span>
                  </button>
                );
              })}
            </div>

            {availability.isFetching ? (
              <p className="mt-3 text-sm text-muted-foreground">Checking availability…</p>
            ) : (availability.data?.slots.length ?? 0) === 0 ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="size-4" /> No times left on this day. Try another date.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                {availability.data?.slots.map((iso) => (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSlot(iso)}
                    className={cn(
                      "rounded-lg border border-border px-2 py-2 text-sm",
                      slot === iso && "border-primary bg-primary/5 font-medium",
                    )}
                  >
                    {formatTime(iso)}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {slot ? (
          <section>
            <h2 className="font-display text-lg font-semibold">4. Your details</h2>
            <form
              className="mt-3 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                confirm.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Anything we should know? (optional)</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>

              <div className="rounded-xl bg-secondary p-4 text-sm">
                <p className="font-medium">{service?.name}</p>
                <p className="mt-1 text-muted-foreground">
                  {formatDate(slot)} at {formatTime(slot)}
                  {locations[0] ? ` · ${locations[0].name}` : ""}
                </p>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={confirm.isPending}>
                {confirm.isPending ? "Confirming…" : "Confirm booking"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Free cancellation up to {business.cancellation_hours} hours before your appointment.
              </p>
            </form>
          </section>
        ) : null}
      </main>
    </div>
  );
}
