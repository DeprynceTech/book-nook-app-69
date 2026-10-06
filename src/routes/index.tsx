import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, BellRing, CreditCard, LineChart, Users, Globe } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import hero from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BookFlow — Online Booking & Business Management Software" },
      {
        name: "description",
        content:
          "Take online bookings, manage staff and locations, send automatic reminders and track revenue — all from one dashboard built for service businesses.",
      },
      { property: "og:title", content: "BookFlow — Online booking for service businesses" },
      {
        property: "og:description",
        content: "Bookings, calendar, customers, reminders and revenue reporting in one place.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: CalendarCheck, title: "Smart scheduling", text: "Real-time availability with buffers, breaks and double-booking protection." },
  { icon: BellRing, title: "Automatic reminders", text: "Email, SMS and WhatsApp confirmations and reminders that cut no-shows." },
  { icon: Users, title: "Customer records", text: "Every client, visit and note kept in one searchable history." },
  { icon: Globe, title: "Public booking page", text: "A branded page your clients can book from on any phone, 24/7." },
  { icon: LineChart, title: "Revenue insights", text: "See bookings, earnings and your busiest hours at a glance." },
  { icon: CreditCard, title: "Flexible plans", text: "Start on a free trial, upgrade as your team and locations grow." },
];

function Landing() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div>
            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground">
              For salons, clinics, studios & consultants
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Bookings that run themselves.
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
              BookFlow gives your business a professional booking page, a shared calendar, automatic
              reminders and clear reporting — so you spend less time on the phone and more time working.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/signup">
                  Start 14-day free trial
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See pricing</Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">No card required. Set up in minutes.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <img
              src={hero}
              alt="A service business owner managing appointments on a laptop"
              className="h-full w-full object-cover"
              loading="eager"
            />
          </div>
        </section>

        <section className="border-y border-border bg-card/40 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Everything you need to run the day</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border border-border bg-background p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <f.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">Ready to take bookings online?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Create your workspace, add your services and share your booking link today.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/signup">
              Create your free account
            </Link>
          </Button>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
