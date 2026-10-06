import { createFileRoute, Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Scheduling, Reminders & Reporting | BookFlow" },
      {
        name: "description",
        content:
          "Explore BookFlow features: online booking pages, staff calendars, conflict-free scheduling, automatic reminders, customer records and revenue reports.",
      },
      { property: "og:title", content: "BookFlow features" },
      {
        property: "og:description",
        content: "Booking pages, calendars, reminders, customer records and reporting for service businesses.",
      },
    ],
  }),
  component: FeaturesPage,
});

const groups = [
  {
    title: "Scheduling",
    items: [
      "Service durations with preparation and clean-up buffers",
      "Per-staff working hours, breaks and holidays",
      "Double-booking prevention checked again at confirmation",
      "Day, week and list calendar views",
      "Waitlist capture when a day is full",
    ],
  },
  {
    title: "Client experience",
    items: [
      "Branded public booking page on its own link",
      "Mobile-first booking in four short steps",
      "Choose a specific team member or first available",
      "Confirmation with all appointment details",
      "Cancellation and reschedule windows you control",
    ],
  },
  {
    title: "Communication",
    items: [
      "Email, SMS and WhatsApp channels",
      "Editable templates with merge fields",
      "Reminder schedule set in hours before the visit",
      "Delivery log for every message sent",
    ],
  },
  {
    title: "Business management",
    items: [
      "Multiple locations under one workspace",
      "Staff roles and permissions",
      "Customer history and notes",
      "Revenue, bookings and no-show reporting",
      "Subscription plans with usage limits",
    ],
  },
];

function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Features</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Everything from the first booking request to the end-of-month revenue summary.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.title} className="rounded-xl border border-border bg-card/40 p-6">
              <h2 className="font-display text-xl font-semibold">{group.title}</h2>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-10">
          <Link to="/signup">
            Start free trial
          </Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
