import { createFileRoute } from "@tanstack/react-router";

import { StatusBadge } from "@/components/StatusBadge";
import { useAdminData } from "@/lib/admin-data";
import { formatDate } from "@/lib/format";
import { AdminHeading } from "./route";

export const Route = createFileRoute("/_authenticated/admin/support")({
  head: () => ({
    meta: [
      { title: "Support tickets — BookFlow Control" },
      { name: "description", content: "Support requests from businesses on BookFlow." },
      { property: "og:title", content: "Support tickets — BookFlow Control" },
      { property: "og:description", content: "Business support requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Support,
});

function Support() {
  const { data } = useAdminData();
  const nameById = new Map((data?.rows ?? []).map((r) => [r.id, r.name]));
  return (
    <>
      <AdminHeading title="Support tickets" description="Requests sent in by businesses." />
      {(data?.tickets.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">No support requests.</p>
      ) : (
        <div className="surface-panel divide-y divide-border">
          {data?.tickets.map((t) => (
            <div key={t.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm font-medium">{t.subject}</p>
                <StatusBadge status={t.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {(t.business_id && nameById.get(t.business_id)) || "Unknown"} · {formatDate(t.created_at)}
              </p>
              <p className="mt-2 text-sm">{t.message}</p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
