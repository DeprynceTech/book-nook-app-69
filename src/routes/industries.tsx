import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Stethoscope, Camera, Briefcase, Dumbbell, Car } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/industries")({
  head: () => ({
    meta: [
      { title: "Industries — Booking Software for Salons, Clinics & More | BookFlow" },
      {
        name: "description",
        content:
          "BookFlow adapts to salons, barbershops, clinics, photographers, coaches, fitness studios and repair shops with industry-ready service setups.",
      },
      { property: "og:title", content: "BookFlow for your industry" },
      {
        property: "og:description",
        content: "Booking and management workflows tailored to salons, clinics, studios and consultants.",
      },
    ],
  }),
  component: IndustriesPage,
});

const industries = [
  { icon: Scissors, name: "Salons & barbershops", text: "Chair-level scheduling, stylist preferences and walk-in waitlists." },
  { icon: Stethoscope, name: "Clinics & therapists", text: "Patient records, longer consults and private notes per visit." },
  { icon: Camera, name: "Photographers & studios", text: "Session packages, deposits and location-based shoots." },
  { icon: Briefcase, name: "Consultants & coaches", text: "Paid discovery calls, recurring sessions and simple invoicing." },
  { icon: Dumbbell, name: "Fitness & wellness", text: "Trainer calendars, class slots and membership reminders." },
  { icon: Car, name: "Repair & home services", text: "Job durations, travel buffers and multi-technician dispatch." },
];

function IndustriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Built for service businesses</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Pick your industry during setup and BookFlow starts you off with sensible services, durations and
          reminder settings you can edit anytime.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {industries.map((item) => (
            <div key={item.name} className="rounded-xl border border-border bg-card/40 p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <item.icon className="size-5" />
              </span>
              <h2 className="mt-4 font-display text-lg font-semibold">{item.name}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{item.text}</p>
            </div>
          ))}
        </div>
        <Button asChild size="lg" className="mt-10">
          <Link to="/signup">
            Set up my business
          </Link>
        </Button>
      </main>
      <SiteFooter />
    </div>
  );
}
