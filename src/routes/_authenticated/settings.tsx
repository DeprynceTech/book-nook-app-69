import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Upload } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — BookFlow" },
      { name: "description", content: "Update your business details, opening hours, booking rules and reminder timing." },
      { property: "og:title", content: "Settings" },
      { property: "og:description", content: "Business details, opening hours and booking rules." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function SettingsPage() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);

  const branding = useQuery({
    queryKey: ["business-branding", business?.id, business?.logo_url, business?.cover_url],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const sign = async (value: string | null) => {
        if (!value || /^https?:\/\//.test(value)) return value;
        const { data } = await supabase.storage.from("business-branding").createSignedUrl(value, 3600);
        return data?.signedUrl ?? null;
      };
      return {
        logo: await sign(business?.logo_url ?? null),
        cover: await sign(business?.cover_url ?? null),
      };
    },
  });

  async function uploadBranding(kind: "logo" | "cover", file?: File) {
    if (!business || !file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a PNG, JPG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB.");
      return;
    }

    setUploading(kind);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${business.id}/${kind}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("business-branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const field = kind === "logo" ? "logo_url" : "cover_url";
      const patch = field === "logo_url" ? { logo_url: path } : { cover_url: path };
      const { error: updateError } = await supabase.from("businesses").update(patch).eq("id", business.id);
      if (updateError) throw updateError;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["current-business"] }),
        queryClient.invalidateQueries({ queryKey: ["business-branding"] }),
      ]);
      toast.success(`${kind === "logo" ? "Logo" : "Cover image"} updated.`);
    } catch {
      toast.error("Could not upload that image.");
    } finally {
      setUploading(null);
    }
  }

  const hours = useQuery({
    queryKey: ["working-hours", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase
        .from("working_hours")
        .select("*")
        .eq("business_id", business!.id)
        .is("staff_id", null)
        .order("day_of_week");
      return data ?? [];
    },
  });

  const saveBusiness = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase
        .from("businesses")
        .update({
          name: String(form.get("name")).trim(),
          description: String(form.get("description") ?? "").trim() || null,
          phone: String(form.get("phone") ?? "").trim() || null,
          email: String(form.get("email") ?? "").trim() || null,
          city: String(form.get("city") ?? "").trim() || null,
          address: String(form.get("address") ?? "").trim() || null,
          cancellation_hours: Number(form.get("cancellation_hours")),
          reschedule_hours: Number(form.get("reschedule_hours")),
          reminder_hours: String(form.get("reminder_hours") ?? "")
            .split(",")
            .map((v) => Number(v.trim()))
            .filter((v) => Number.isFinite(v) && v > 0),
        })
        .eq("id", business!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Settings saved.");
      void queryClient.invalidateQueries({ queryKey: ["current-business"] });
    },
    onError: () => toast.error("Could not save your settings."),
  });

  const togglePublished = useMutation({
    mutationFn: async (published: boolean) => {
      const { error } = await supabase.from("businesses").update({ is_published: published }).eq("id", business!.id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["current-business"] }),
    onError: () => toast.error("Could not update your booking page."),
  });

  const saveHour = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { is_open?: boolean; open_time?: string; close_time?: string };
    }) => {
      const { error } = await supabase.from("working_hours").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["working-hours"] }),
    onError: () => toast.error("Could not update opening hours."),
  });

  if (!business) {
    return (
      <AppShell title="Settings" description="Loading…">
        <p className="text-sm text-muted-foreground">Loading your workspace…</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Settings" description="Business details and booking rules.">
      <div className="grid gap-6 lg:grid-cols-2">
        <form
          className="surface-panel space-y-4 p-4 sm:p-5"
          onSubmit={(e) => {
            e.preventDefault();
            saveBusiness.mutate(new FormData(e.currentTarget));
          }}
        >
          <h2 className="font-display text-lg font-semibold">Business details</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Business name</Label>
            <Input id="name" name="name" defaultValue={business.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={business.description ?? ""} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={business.phone ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={business.email ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={business.city ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={business.address ?? ""} />
            </div>
          </div>

          <h3 className="pt-2 font-display text-base font-semibold">Booking rules</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancellation_hours">Cancellation notice (hours)</Label>
              <Input
                id="cancellation_hours"
                name="cancellation_hours"
                type="number"
                min="0"
                defaultValue={business.cancellation_hours}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reschedule_hours">Reschedule notice (hours)</Label>
              <Input
                id="reschedule_hours"
                name="reschedule_hours"
                type="number"
                min="0"
                defaultValue={business.reschedule_hours}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reminder_hours">Send reminders (hours before, comma separated)</Label>
            <Input id="reminder_hours" name="reminder_hours" defaultValue={business.reminder_hours.join(", ")} />
          </div>

          <Button type="submit" disabled={saveBusiness.isPending}>
            {saveBusiness.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>

        <div className="space-y-6">
          <div className="surface-panel p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <ImagePlus className="mt-0.5 size-5 text-primary" />
              <div>
                <h2 className="font-display text-lg font-semibold">Booking page branding</h2>
                <p className="mt-1 text-sm text-muted-foreground">Add your logo and a wide cover image customers see when booking.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-[9rem_1fr]">
              <div>
                <p className="mb-2 text-sm font-medium">Logo</p>
                <div className="grid aspect-square place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary">
                  {branding.data?.logo ? (
                    <img src={branding.data.logo} alt="Business logo preview" className="size-full object-contain p-3" />
                  ) : (
                    <ImagePlus className="size-7 text-muted-foreground" />
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-2 w-full">
                  <label>
                    <Upload className="size-4" /> {uploading === "logo" ? "Uploading…" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(event) => void uploadBranding("logo", event.target.files?.[0])}
                    />
                  </label>
                </Button>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Cover image</p>
                <div className="grid aspect-[16/6] place-items-center overflow-hidden rounded-lg border border-dashed border-border bg-secondary">
                  {branding.data?.cover ? (
                    <img src={branding.data.cover} alt="Booking cover preview" className="size-full object-cover" />
                  ) : (
                    <ImagePlus className="size-7 text-muted-foreground" />
                  )}
                </div>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <label>
                    <Upload className="size-4" /> {uploading === "cover" ? "Uploading…" : "Upload cover"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={uploading !== null}
                      onChange={(event) => void uploadBranding("cover", event.target.files?.[0])}
                    />
                  </label>
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">PNG, JPG or WebP. Up to 5 MB.</p>
              </div>
            </div>
          </div>

          <div className="surface-panel p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold">Booking page</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your link: <span className="font-medium">/book/{business.slug}</span>
                </p>
              </div>
              <Switch
                checked={business.is_published}
                onCheckedChange={(checked) => togglePublished.mutate(checked)}
                aria-label="Accept online bookings"
              />
            </div>
          </div>

          <div className="surface-panel p-4 sm:p-5">
            <h2 className="font-display text-lg font-semibold">Opening hours</h2>
            <div className="mt-4 space-y-3">
              {hours.data?.map((hour) => (
                <div key={hour.id} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 text-sm">{dayNames[hour.day_of_week]}</span>
                  <Switch
                    checked={hour.is_open}
                    onCheckedChange={(checked) => saveHour.mutate({ id: hour.id, patch: { is_open: checked } })}
                    aria-label={`Open on ${dayNames[hour.day_of_week]}`}
                  />
                  <Input
                    type="time"
                    className="w-32"
                    defaultValue={hour.open_time.slice(0, 5)}
                    onBlur={(e) => saveHour.mutate({ id: hour.id, patch: { open_time: e.target.value } })}
                  />
                  <Input
                    type="time"
                    className="w-32"
                    defaultValue={hour.close_time.slice(0, 5)}
                    onBlur={(e) => saveHour.mutate({ id: hour.id, patch: { close_time: e.target.value } })}
                  />
                </div>
              ))}
              {(hours.data?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No opening hours set yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
