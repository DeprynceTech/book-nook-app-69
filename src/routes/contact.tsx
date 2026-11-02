import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { SiteHeader } from "@/components/marketing/SiteHeader";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CONTACT_EMAIL, CONTACT_PHONE, whatsappLink } from "@/lib/contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact the BookFlow team" },
      { name: "description", content: "Message BookFlow on WhatsApp, call us or send an email about plans, onboarding or support." },
      { property: "og:title", content: "Contact BookFlow" },
      { property: "og:description", content: "WhatsApp, call or email the BookFlow team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(100),
  message: z.string().trim().min(1, "Please write a message").max(1000),
});

function ContactPage() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  function send(via: "whatsapp" | "email") {
    const parsed = schema.safeParse({ name, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    const text = `Hi, I'm ${parsed.data.name}.\n\n${parsed.data.message}`;
    const url =
      via === "whatsapp"
        ? whatsappLink(text)
        : `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`BookFlow enquiry from ${parsed.data.name}`)}&body=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
  }

  const cards = [
    { icon: MessageCircle, title: "WhatsApp", value: CONTACT_PHONE, href: whatsappLink("Hi BookFlow, I have a question.") },
    { icon: Phone, title: "Call us", value: CONTACT_PHONE, href: `tel:${CONTACT_PHONE}` },
    { icon: Mail, title: "Email", value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-14 sm:px-6">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Contact us</h1>
        <p className="mt-3 text-muted-foreground">Message us directly on WhatsApp, give us a call, or send an email.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <a key={c.title} href={c.href} target="_blank" rel="noreferrer" className="surface-panel block p-5 transition-colors hover:border-primary">
              <c.icon className="size-5 text-primary" />
              <p className="mt-3 font-display font-semibold">{c.title}</p>
              <p className="mt-1 break-all text-sm text-muted-foreground">{c.value}</p>
            </a>
          ))}
        </div>

        <div className="surface-panel mt-8 p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">Send us a message</h2>
          <div className="mt-4 space-y-3">
            <Input placeholder="Your name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <Textarea placeholder="How can we help?" rows={5} value={message} maxLength={1000} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => send("whatsapp")}><MessageCircle className="size-4" /> Send on WhatsApp</Button>
              <Button variant="outline" onClick={() => send("email")}><Mail className="size-4" /> Send by email</Button>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
