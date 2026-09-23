import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of service — BookFlow" },
      {
        name: "description",
        content: "The terms that apply when you use BookFlow to take bookings and manage your service business.",
      },
      { property: "og:title", content: "BookFlow terms of service" },
      { property: "og:description", content: "Plans, billing, acceptable use and cancellation terms for BookFlow." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TermsPage,
});

const sections = [
  {
    title: "Your account",
    body: "You are responsible for your sign-in details and for the staff you invite into your workspace. Keep your business and contact details accurate.",
  },
  {
    title: "Plans and billing",
    body: "Paid plans are billed monthly in advance. Trials convert to the selected plan at the end of the trial period unless cancelled. Plan limits on appointments, staff and locations apply as shown on the pricing page.",
  },
  {
    title: "Cancellation",
    body: "You can cancel at any time. Your workspace stays available until the end of the period already paid for. Fees already charged are not refunded for partial periods.",
  },
  {
    title: "Acceptable use",
    body: "Do not use BookFlow to send unsolicited messages, to store data you have no right to hold, or to attempt to access another business's workspace.",
  },
  {
    title: "Your content and customers",
    body: "Your business data and customer records stay yours. You are responsible for having permission to contact the customers you add.",
  },
  {
    title: "Service availability",
    body: "We work to keep BookFlow available at all times but cannot guarantee uninterrupted service. Scheduled maintenance is announced in advance where possible.",
  },
];

function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Terms of service</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A template set of terms. Have them reviewed by a lawyer before you rely on them.
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-xl font-semibold">{section.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
