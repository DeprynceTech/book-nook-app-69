import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact the BookFlow team" },
      {
        name: "description",
        content: "Get in touch with BookFlow about pricing, onboarding your business, or help with your booking page.",
      },
      { property: "og:title", content: "Contact BookFlow" },
      { property: "og:description", content: "Questions about plans, onboarding or your booking page? Talk to us." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-muted-foreground">
          We reply to every message, usually within one working day.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card/40 p-6">
            <h2 className="font-display text-lg font-semibold">Sales &amp; onboarding</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Setting up your services, staff and booking page.
            </p>
            <p className="mt-3 text-sm font-medium">hello@bookflow.app</p>
          </div>
          <div className="rounded-xl border border-border bg-card/40 p-6">
            <h2 className="font-display text-lg font-semibold">Support</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Already a customer? Open a request from your dashboard for the fastest reply.
            </p>
            <p className="mt-3 text-sm font-medium">support@bookflow.app</p>
          </div>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          These are placeholder contact details — send me the real email addresses and phone number and I will put
          them in.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
