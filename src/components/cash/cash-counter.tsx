"use client";

import {
  DENOMINATIONS,
  BILL_THRESHOLD,
  sumBreakdown,
  countPieces,
  type CashBreakdown,
} from "@/lib/cash-denominations";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("es-DO").format(n);
const fmtDop = (n: number) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  }).format(n);

// Colores reales de los billetes RD$ (serie actual del Banco Central).
const BILL_GRADIENT: Record<number, string> = {
  2000: "from-blue-500 to-blue-700",
  1000: "from-red-500 to-red-700",
  500: "from-emerald-500 to-emerald-700",
  200: "from-pink-400 to-pink-600",
  100: "from-orange-400 to-orange-600",
  50: "from-purple-500 to-purple-700",
};

// Contador de billetes y monedas: una tarjeta por denominación con cantidad y subtotal.
export function CashCounter({
  value,
  onChange,
  className,
}: {
  value: CashBreakdown;
  onChange: (next: CashBreakdown) => void;
  className?: string;
}) {
  const setCount = (denom: number, raw: string) => {
    const count = Math.max(0, Math.floor(Number(raw.replace(/[^0-9]/g, "")) || 0));
    const next = { ...value };
    if (count > 0) next[String(denom)] = count;
    else delete next[String(denom)];
    onChange(next);
  };

  const total = sumBreakdown(value);
  const pieces = countPieces(value);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {DENOMINATIONS.map((denom) => {
          const count = value[String(denom)] ?? 0;
          const subtotal = denom * count;
          const isBill = denom >= BILL_THRESHOLD;
          const active = count > 0;
          return (
            <div
              key={denom}
              className={cn(
                "rounded-xl border p-2 transition-all",
                active ? "border-foreground/20 shadow-sm" : "border-border",
              )}
            >
              {isBill ? (
                <div
                  className={cn(
                    "flex h-10 items-center justify-center rounded-md bg-gradient-to-br shadow-inner ring-1 ring-black/10",
                    BILL_GRADIENT[denom],
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/80">
                    RD$
                  </span>
                  <span className="ml-1 text-base font-bold tracking-tight text-white drop-shadow-sm">
                    {fmt(denom)}
                  </span>
                </div>
              ) : (
                <div className="flex h-10 items-center justify-center">
                  <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow ring-1 ring-amber-600/40">
                    <span className="text-xs font-bold text-amber-950">{denom}</span>
                  </div>
                </div>
              )}

              <div className="mt-2 flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={count ? String(count) : ""}
                  onChange={(e) => setCount(denom, e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  placeholder="0"
                  aria-label={`Cantidad de RD$${denom}`}
                  className="h-8 w-12 shrink-0 rounded-md border border-input bg-transparent px-1 text-center text-sm font-semibold tabular-nums outline-none transition-colors placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
                <span
                  className={cn(
                    "flex-1 truncate text-right text-xs tabular-nums",
                    active ? "font-semibold text-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {fmt(subtotal)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/40 px-3 py-2.5">
        <span className="text-xs text-muted-foreground">
          {pieces} {pieces === 1 ? "pieza" : "piezas"}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Total contado</span>
          <span className="text-lg font-bold tabular-nums text-foreground">{fmtDop(total)}</span>
        </div>
      </div>
    </div>
  );
}
