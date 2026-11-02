import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2, Mail, PartyPopper, Smartphone } from "lucide-react";
import { toast } from "sonner";

import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { COUNTRIES, flag, normalizePhone, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your BookFlow account" },
      { name: "description", content: "Get your business online and start accepting appointments in minutes." },
      { property: "og:title", content: "Create your BookFlow account" },
      { property: "og:description", content: "Simple booking. Better business. Start your free trial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

type Step = 1 | 2 | 3 | 4;
const STEPS = ["Your details", "Verify email", "Verify phone"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function strength(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}
const STRENGTH = ["Too weak", "Weak", "Fair", "Good", "Strong"];

function useCooldown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, () => setLeft(30)] as const;
}

function SignupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [business, setBusiness] = useState("");
  const [country, setCountry] = useState<Country>(COUNTRIES.find((c) => c.code === "UG")!);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [cooldown, startCooldown] = useCooldown();

  const national = normalizePhone(country, phone);
  const errors = {
    phone: phone && !national ? `Enter a valid ${country.name} number (${country.min === country.max ? country.min : `${country.min}–${country.max}`} digits).` : "",
    email: email && !EMAIL_RE.test(email) ? "Enter a valid email address." : "",
    password: password && password.length < 8 ? "Use at least 8 characters." : "",
    confirm: confirm && confirm !== password ? "Passwords don't match." : "",
  };
  const valid =
    business.trim().length > 1 && !!national && name.trim().length > 1 && EMAIL_RE.test(email) &&
    password.length >= 8 && confirm === password && agree;
  const fullPhone = national ? `+${country.dial}${national}` : "";

  // If the person confirms by clicking the email link instead of typing the code.
  useEffect(() => {
    if (step !== 2) return;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) setStep(3);
    });
    return () => data.subscription.unsubscribe();
  }, [step]);

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
          data: { full_name: name, business_name: business, country: country.code, phone: fullPhone },
        },
      });
      if (error) throw error;
      if (data.user && data.user.identities?.length === 0) throw new Error("An account with this email already exists. Try logging in.");
      setCode("");
      setCodeError("");
      startCooldown();
      setStep(data.session ? 3 : 2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyEmail() {
    if (code.length !== 6) return;
    setBusy(true);
    setCodeError("");
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) {
      setCodeError(/expired/i.test(error.message) ? "This code has expired or was already used. Request a new one." : "That code isn't right. Check the email and try again.");
      return;
    }
    toast.success("Email verified");
    setStep(3);
  }

  async function resendEmail() {
    setBusy(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    startCooldown();
    toast.success("A new code is on its way.");
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (res.error) toast.error("Google sign-in failed. Please try again.");
    else if (!res.redirected) void navigate({ to: "/onboarding" });
  }

  return (
    <div className="hero-gradient relative flex min-h-screen items-center justify-center bg-secondary/40 px-3 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-[600px]">
        <div className="rounded-3xl border border-border bg-card p-5 shadow-lift sm:p-10">
          <Link to="/" className="mx-auto flex w-fit items-center" aria-label="BookFlow home">
            <BrandMark className="size-11" />
          </Link>

          <ol className="mt-6 flex items-center" aria-label="Signup progress">
            {STEPS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const current = step === n;
              return (
                <li key={label} className={cn("flex items-center", i < 2 && "flex-1")} aria-current={current ? "step" : undefined}>
                  <div className="flex flex-col items-center gap-1.5 sm:flex-row">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold transition-colors",
                      done ? "border-primary bg-primary text-primary-foreground" : current ? "border-primary bg-secondary text-primary" : "border-border text-muted-foreground")}>
                      {done ? <Check className="size-4" /> : n}
                    </span>
                    <span className={cn("whitespace-nowrap text-[11px] font-medium sm:text-sm", current ? "text-foreground" : "text-muted-foreground")}>{label}</span>
                  </div>
                  {i < 2 ? <span className={cn("mx-2 h-0.5 flex-1 rounded-full sm:mx-3", done ? "bg-primary" : "bg-border")} /> : null}
                </li>
              );
            })}
          </ol>

          {step === 1 ? (
            <form onSubmit={submitDetails} className="mt-8" noValidate>
              <h1 className="text-2xl font-semibold sm:text-3xl">Create your Bookflow account</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Get your business online and start accepting appointments in minutes.</p>

              <Button type="button" variant="outline" className="mt-6 h-11 w-full gap-2" onClick={google}>
                <GoogleIcon /> Continue with Google
              </Button>
              <div className="my-6 flex items-center gap-3 text-xs font-medium text-muted-foreground">
                <span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-4">
                <Field id="business" label="Business / workspace name">
                  <Input id="business" value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Glitters Unisex Salon" className="h-11" />
                </Field>
                <Field id="country" label="Country">
                  <CountryPicker id="country" value={country} onChange={setCountry} showName />
                </Field>
                <Field id="phone" label="Phone number" error={errors.phone}>
                  <div className="flex gap-2">
                    <CountryPicker id="dial" value={country} onChange={setCountry} />
                    <Input id="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 772 123456" className="h-11" autoComplete="tel-national" aria-invalid={!!errors.phone} />
                  </div>
                </Field>
                <Field id="name" label="Your name">
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" className="h-11" autoComplete="name" />
                </Field>
                <Field id="email" label="Email address" error={errors.email}>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value.trim())} placeholder="e.g. you@company.com" className="h-11" autoComplete="email" aria-invalid={!!errors.email} />
                </Field>
                <Field id="password" label="Password" error={errors.password}>
                  <PasswordInput id="password" value={password} onChange={setPassword} placeholder="At least 8 characters" autoComplete="new-password" />
                  {password ? (
                    <div className="mt-2 flex items-center gap-2" aria-live="polite">
                      <div className="flex flex-1 gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < strength(password) ? (strength(password) >= 3 ? "bg-success" : strength(password) === 2 ? "bg-warning" : "bg-destructive") : "bg-border")} />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{STRENGTH[strength(password)]}</span>
                    </div>
                  ) : null}
                </Field>
                <Field id="confirm" label="Confirm password" error={errors.confirm}>
                  <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
                </Field>
                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
                  <Label htmlFor="agree" className="text-sm font-normal leading-snug text-muted-foreground">
                    I agree to the <Link to="/terms" className="font-medium text-primary hover:underline">Terms & Conditions</Link> and{" "}
                    <Link to="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
                  </Label>
                </div>
              </div>

              <Button type="submit" className="mt-6 h-12 w-full text-base" disabled={!valid || busy}>
                {busy ? <><Loader2 className="size-4 animate-spin" /> Sending code…</> : "Continue"}
              </Button>
            </form>
          ) : null}

          {step === 2 ? (
            <div className="mt-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Mail className="size-6" /></span>
              <h1 className="mt-4 text-2xl font-semibold">Verify your email</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">We've sent a verification code to your email address.</p>
              <p className="mt-1 font-medium">{email}</p>
              <OtpBlock code={code} setCode={(v) => { setCode(v); setCodeError(""); }} error={codeError} />
              <p className="mt-3 text-xs text-muted-foreground">You can also just click the link in the email — this page will move on by itself.</p>
              <Button className="mt-5 h-12 w-full text-base" disabled={code.length !== 6 || busy} onClick={verifyEmail}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : null} Verify email
              </Button>
              <Resend left={cooldown} busy={busy} onResend={resendEmail} />
              <button type="button" className="mt-2 text-sm font-medium text-primary hover:underline" onClick={() => setStep(1)}>Change email address</button>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="mt-8 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-secondary text-primary"><Smartphone className="size-6" /></span>
              <h1 className="mt-4 text-2xl font-semibold">Verify your phone number</h1>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                <span aria-hidden>{flag(country.code)}</span> +{country.dial} {national ? `${"•".repeat(Math.max(0, national.length - 3))}${national.slice(-3)}` : ""}
              </p>
              <div className="mt-5 rounded-2xl border border-border bg-muted/50 p-4 text-left text-sm text-muted-foreground">
                Text-message codes aren't switched on yet, so we've saved your number and you can verify it later from Settings.
              </div>
              <Button className="mt-5 h-12 w-full text-base" onClick={() => setStep(4)}>Continue</Button>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="mt-8 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-success/15 text-success"><PartyPopper className="size-7" /></span>
              <h1 className="mt-4 text-2xl font-semibold">Your Bookflow account is ready!</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Let's set up your business and start accepting appointments.</p>
              <Button className="mt-6 h-12 w-full text-base" onClick={() => navigate({ to: "/onboarding" })}>Go to your dashboard</Button>
            </div>
          ) : null}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account? <Link to="/auth" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          By continuing, you agree to our <Link to="/terms" className="underline">Terms & Conditions</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}

function PasswordInput(props: { id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={props.id} type={show ? "text" : "password"} value={props.value} onChange={(e) => props.onChange(e.target.value)} placeholder={props.placeholder} autoComplete={props.autoComplete} className="h-11 pr-11" />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

function CountryPicker({ id, value, onChange, showName }: { id: string; value: Country; onChange: (c: Country) => void; showName?: boolean }) {
  const [open, setOpen] = useState(false);
  const list = useMemo(() => COUNTRIES, []);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button id={id} type="button" variant="outline" role="combobox" aria-expanded={open} className={cn("h-11 justify-between font-normal", showName ? "w-full" : "w-[110px] shrink-0 px-3")}>
          <span className="flex items-center gap-2 truncate">
            <span aria-hidden>{flag(value.code)}</span>
            {showName ? value.name : `+${value.dial}`}
          </span>
          <ChevronsUpDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search country…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {list.map((c) => (
              <CommandItem key={c.code} value={`${c.name} +${c.dial}`} onSelect={() => { onChange(c); setOpen(false); }}>
                <span aria-hidden>{flag(c.code)}</span>
                <span className="flex-1">{c.name}</span>
                <span className="text-muted-foreground">+{c.dial}</span>
                {c.code === value.code ? <Check className="size-4" /> : null}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function OtpBlock({ code, setCode, error }: { code: string; setCode: (v: string) => void; error: string }) {
  return (
    <div className="mt-6 flex flex-col items-center">
      <InputOTP maxLength={6} value={code} onChange={setCode} inputMode="numeric" pattern="^[0-9]*$" aria-label="6-digit code">
        <InputOTPGroup className="gap-1.5 sm:gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} className={cn("size-11 rounded-xl border text-lg sm:size-12", error && "border-destructive")} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      {error ? <p className="mt-2 text-sm text-destructive" role="alert">{error}</p> : null}
    </div>
  );
}

function Resend({ left, busy, onResend }: { left: number; busy: boolean; onResend: () => void }) {
  return (
    <p className="mt-5 text-sm text-muted-foreground">
      Didn't receive the code?{" "}
      {left > 0 ? <span>Resend in {left}s</span> : (
        <button type="button" disabled={busy} onClick={onResend} className="font-semibold text-primary hover:underline">Resend code</button>
      )}
    </p>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .6 4.2 1.6l3.1-3.1A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  );
}
