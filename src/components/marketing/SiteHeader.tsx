import { Link } from "@tanstack/react-router";
import { BrandMark } from "@/components/BrandMark";
import { useState } from "react";
import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";

const links = [
  { to: "/features", label: "Features" },
  { to: "/industries", label: "Industries" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark />
          <span className="font-display text-lg font-semibold">BookFlow</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <Button asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/auth">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/auth" search={{ mode: "register" }}>
                  Start free
                </Link>
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="ml-auto md:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="font-display">BookFlow</SheetTitle>
            <div className="mt-6 flex flex-col gap-3">
              {links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="text-sm font-medium text-muted-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="mt-3">
                <Link to={user ? "/dashboard" : "/auth"} onClick={() => setOpen(false)}>
                  {user ? "Go to dashboard" : "Start free"}
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
