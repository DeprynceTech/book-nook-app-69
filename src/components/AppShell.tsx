import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { whatsappLink } from "@/lib/contact";
import {
  CalendarDays,
  ChartLine,
  CreditCard,
  ExternalLink,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Menu,
  Scissors,
  Settings,
  Users,
  UserSquare2,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, useIsSuperAdmin } from "@/hooks/useBusiness";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/appointments", label: "Appointments", icon: ListChecks },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/services", label: "Services", icon: Scissors },
  { to: "/staff", label: "Staff", icon: UserSquare2 },
  { to: "/reports", label: "Reports", icon: ChartLine },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { data: business } = useBusiness();

  return (
    <div className="flex h-full flex-col gap-6 bg-sidebar p-4 text-sidebar-foreground">
      <Link to="/" className="px-1" onClick={onNavigate} aria-label="BookFlow home">
        <BrandMark />
      </Link>

      {business ? (
        <div className="rounded-xl bg-sidebar-accent p-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
              {initials(business.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{business.name}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">/book/{business.slug}</p>
            </div>
          </div>
          <a
            href={`/book/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-sidebar-primary hover:underline"
          >
            View booking page <ExternalLink className="size-3" />
          </a>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        <NavLinks onNavigate={onNavigate} />
      </div>

      <Link
        to="/support"
        onClick={onNavigate}
        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent"
      >
        <LifeBuoy className="size-4" />
        Support
      </Link>
    </div>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsSuperAdmin();
  const { data: business } = useBusiness();
  const pathname = useRouterState({ select: (st) => st.location.pathname });
  const access = useQuery({
    queryKey: ["business-access", business?.id],
    enabled: Boolean(business?.id),
    queryFn: async () => {
      const { data } = await supabase.rpc("business_has_access", { _business_id: business!.id });
      return Boolean(data);
    },
  });
  const locked = access.data === false && pathname !== "/billing" && pathname !== "/support";

  useEffect(() => {
    if (isAdmin) void navigate({ to: "/admin", replace: true });
  }, [isAdmin, navigate]);

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <SidebarBody />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-lg font-semibold sm:text-xl">{title}</h1>
            {description ? (
              <p className="truncate text-xs text-muted-foreground sm:text-sm">{description}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {locked ? (
            <div className="surface-panel mx-auto max-w-lg p-6 text-center">
              <Lock className="mx-auto size-8 text-primary" />
              <h2 className="mt-3 font-display text-xl font-semibold">Your account is locked</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your 7-day free trial has ended. Choose a plan and pay, and we'll unlock your account straight away.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild><Link to="/billing">See plans</Link></Button>
                <Button asChild variant="outline">
                  <a href={whatsappLink(`Hi, I'd like to unlock ${business?.name ?? "my business"} on BookFlow.`)} target="_blank" rel="noreferrer">
                    WhatsApp us
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
