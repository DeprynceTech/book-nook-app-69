import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your business — BookFlow" },
      { name: "description", content: "Create your BookFlow workspace: business details, first location and services." },
      { property: "og:title", content: "Set up your BookFlow workspace" },
      { property: "og:description", content: "Add your business details to start taking bookings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const categories = [
  "Salon & Spa",
  "Barbershop",
  "Clinic & Health",
  "Photography",
  "Consulting",
  "Fitness & Wellness",
  "Repair & Home Services",
  "Other",
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useBusiness();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState(categories[0]!);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && existing) void navigate({ to: "/dashboard", replace: true });
  }, [isLoading, existing, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Your session expired. Please sign in again.");

      const finalSlug = slugify(slug || name) || `business-${Date.now()}`;

      const { data: business, error } = await supabase
        .from("businesses")
        .insert({
          owner_id: userId,
          name: name.trim(),
          slug: finalSlug,
          category,
          city: city.trim() || null,
          phone: phone.trim() || null,
          description: description.trim() || null,
          email: userData.user?.email ?? null,
          onboarding_completed: true,
          is_published: true,
        })
        .select("id")
        .single();

      if (error) throw new Error(error.message.includes("duplicate") ? "That booking link is already taken." : error.message);

      await supabase.from("user_roles").insert({ user_id: userId, role: "owner" });
      await supabase.from("business_members").insert({
        business_id: business.id,
        user_id: userId,
        role: "owner",
      });
      await supabase.from("locations").insert({
        business_id: business.id,
        name: "Main location",
        city: city.trim() || null,
        phone: phone.trim() || null,
      });
      await supabase.from("working_hours").insert(
        [1, 2, 3, 4, 5, 6].map((day) => ({
          business_id: business.id,
          day_of_week: day,
          is_open: day !== 6,
          open_time: "09:00",
          close_time: "17:00",
        })),
      );

      const { data: plan } = await supabase
        .from("subscription_plans")
        .select("id")
        .eq("is_active", true)
        .order("sort_order")
        .limit(1)
        .maybeSingle();

      if (plan) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 14);
        await supabase.from("subscriptions").insert({
          business_id: business.id,
          plan_id: plan.id,
          status: "trialing",
          current_period_start: new Date().toISOString(),
          current_period_end: trialEnd.toISOString(),
          trial_ends_at: trialEnd.toISOString(),
        });
      }

      await queryClient.invalidateQueries();
      toast.success("Your workspace is ready.");
      await navigate({ to: "/services", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your business.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Tell us about your business</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We'll use this to create your booking page and starter schedule. You can change everything later.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="space-y-1.5">
            <Label htmlFor="bizName">Business name</Label>
            <Input
              id="bizName"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug("");
              }}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Booking link</Label>
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground">/book/</span>
              <Input
                id="slug"
                value={slug}
                placeholder={slugify(name) || "your-business"}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Industry</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bizPhone">Phone</Label>
              <Input id="bizPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc">Short description</Label>
            <Textarea id="desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create my workspace"}
          </Button>
        </form>
      </div>
    </div>
  );
}
