import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  pending: "bg-warning/20 text-warning-foreground",
  confirmed: "bg-info/15 text-info",
  completed: "bg-success/15 text-success",
  cancelled: "bg-destructive/12 text-destructive",
  rescheduled: "bg-accent/30 text-accent-foreground",
  no_show: "bg-destructive/12 text-destructive",
  unpaid: "bg-muted text-muted-foreground",
  successful: "bg-success/15 text-success",
  failed: "bg-destructive/12 text-destructive",
  refunded: "bg-accent/30 text-accent-foreground",
  active: "bg-success/15 text-success",
  trialing: "bg-info/15 text-info",
  past_due: "bg-warning/20 text-warning-foreground",
  expired: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {status === "no_show" ? "failed / no-show" : status.replace("_", " ")}
    </span>
  );
}
