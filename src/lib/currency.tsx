import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { formatCurrency } from "@/lib/format";

export const CURRENCIES = [
  "USD", "UGX", "KES", "TZS", "RWF", "NGN", "GHS", "ZAR", "EUR", "GBP", "CAD", "AUD", "INR", "AED", "ZMW", "ETB", "XAF", "XOF",
] as const;

const KEY = "bookflow-currency";

/** Plan prices are stored in USD; this converts them using live USD exchange rates. */
export function useDisplayCurrency() {
  const [currency, setCurrencyState] = useState("USD");
  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) setCurrencyState(saved);
  }, []);
  const setCurrency = (c: string) => {
    setCurrencyState(c);
    window.localStorage.setItem(KEY, c);
  };

  const rates = useQuery({
    queryKey: ["usd-rates"],
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      const res = await fetch("https://open.er-api.com/v6/latest/USD");
      const json = (await res.json()) as { rates?: Record<string, number> };
      return json.rates ?? { USD: 1 };
    },
  });

  const rate = currency === "USD" ? 1 : rates.data?.[currency];
  const format = (amount: number | string, fromCurrency = "USD") => {
    const value = Number(amount);
    if (fromCurrency !== "USD" || !rate) return formatCurrency(value, fromCurrency);
    const converted = value * rate;
    const rounded = converted >= 1000 ? Math.round(converted / 100) * 100 : Math.round(converted * 100) / 100;
    return formatCurrency(rounded, currency);
  };

  return { currency, setCurrency, format, ready: Boolean(rate) };
}

export function CurrencySelect({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      Show prices in
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </label>
  );
}
