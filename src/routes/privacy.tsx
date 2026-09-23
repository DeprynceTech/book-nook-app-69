import { createFileRoute } from "@tanstack/react-router";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy policy — BookFlow" },
      {
        name: "description",
        content: "How BookFlow collects, stores and protects business and customer data used for appointment booking.",
      },
      { property: "og:title", content: "BookFlow privacy policy" },
      { property: "og:description", content: "What data BookFlow stores and how it is protected." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PrivacyPage,
});

const sections = [
  {
    title: "What we collect",
    body: "Account details for business owners and staff, business profile information, service and pricing records, and appointment details including the customer name and contact details supplied when a booking is made.",
  },
  {
    title: "How we use it",
    body: "To run your booking page, show your calendar, send appointment confirmations and reminders through email, SMS or WhatsApp, and produce the reports in your dashboard.",
  },
  {
    title: "Data separation",
    body: "Each business is a separate workspace. Records are filtered by business at the database level so one business can never read another business's appointments or customers.",
  },
  {
    title: "Sharing",
    body: "We share data only with the providers needed to deliver the service, such as message delivery and payment processing. We do not sell personal data.",
  },
  {
    title: "Retention and deletion",
    body: "Records are kept while your workspace is active. You can ask us to delete your workspace and its data at any time.",
  },
  {
    title: "Your choices",
    body: "Business owners can edit or remove customer records from the dashboard. Customers can ask the business they booked with, or us, to correct or remove their details.",
  },
];

function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A plain summary of how data is handled. This is a template and not legal advice — have it reviewed before
          publishing.
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
