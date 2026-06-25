"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { closeCashSession, type CashSession, type CashMovement } from "@/lib/data/cash";
import { useAuth } from "@/lib/auth/context";
import { toast } from "sonner";
import {
  Loader2,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  Calculator,
  Pencil,
} from "lucide-react";
import { CashCounter } from "@/components/cash/cash-counter";
import { sumBreakdown, type CashBreakdown } from "@/lib/cash-denominations";

const formatCurrency = (value: number) => {
  if (!Number.isFinite(value)) return "RD$ 0.00";
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const toNum = (v: unknown): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

interface CloseCashDialogProps {
  open: boolean;
  onClose: () => void;
  session: CashSession | null;
  movements: CashMovement[];
  onSuccess: () => void;
}

export function CloseCashDialog({
  open,
  onClose,
  session,
  movements,
  onSuccess,
}: CloseCashDialogProps) {
  const { tenantId, user } = useAuth();

  const [amount, setAmount] = useState("");
  const [counted, setCounted] = useState<CashBreakdown>({});
  const [entry, setEntry] = useState<"count" | "quick">("count");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const breakdown = useMemo(() => {
    if (!session) {
      return {
        opening: 0,
        cashPayments: 0,
        deposits: 0,
        withdrawals: 0,
        expected: 0,
      };
    }

    const opening = toNum(session.openingBalance);
    const cashPayments = movements
      .filter((m) => m.type === "payment" && (m.method === "cash" || !m.method))
      .reduce((sum, m) => sum + toNum(m.amount), 0);
    const deposits = movements
      .filter((m) => m.type === "deposit")
      .reduce((sum, m) => sum + toNum(m.amount), 0);
    const withdrawals = movements
      .filter((m) => m.type === "withdrawal")
      .reduce((sum, m) => sum + toNum(m.amount), 0);

    return {
      opening,
      cashPayments,
      deposits,
      withdrawals,
      // currentBalance is tracked transactionally on every movement, so it's the
      // authoritative expected drawer total even if the movement feed is capped.
      expected: toNum(session.currentBalance),
    };
  }, [session, movements]);

  // Reset on close.
  useEffect(() => {
    if (!open) {
      setAmount("");
      setCounted({});
      setEntry("count");
      setNotes("");
    }
  }, [open]);

  const counting = entry === "count";
  const countedTotal = sumBreakdown(counted);
  const numericAmount = counting ? countedTotal : toNum(amount);
  const difference = numericAmount - breakdown.expected;
  const absDifference = Math.abs(difference);
  const isMatch = absDifference < 0.01;
  const hasAmount = counting ? countedTotal > 0 : amount.trim().length > 0;
  const isSurplus = difference > 0; // sobra dinero (verde); falta = rojo
  const needsJustification = hasAmount && !isMatch;
  const justified = notes.trim().length > 0;
  const canClose = hasAmount && !saving && (!needsJustification || justified);

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(/[^0-9.]/g, "").replace(/(\..*?)\..*/g, "$1");
    setAmount(cleaned);
  }

  async function handleSubmit() {
    if (!session || !tenantId || !user) return;
    setSaving(true);
    try {
      await closeCashSession(
        tenantId,
        session.id,
        user.uid,
        numericAmount,
        counting && countedTotal > 0 ? counted : undefined,
        breakdown.expected,
        notes || undefined,
      );
      toast.success("Caja cerrada exitosamente");
      onClose();
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error al cerrar la caja");
    } finally {
      setSaving(false);
    }
  }

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="top-[4vh] flex max-h-[86vh] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Header */}
        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-b">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                Cerrar caja
              </DialogTitle>
              <DialogDescription className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {session.sessionCode
                  ? `Cierre de ${session.sessionCode}`
                  : "Realiza el conteo final y cierra la sesión"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Breakdown */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Desglose esperado
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {movements.length} movimientos
              </span>
            </div>
            <div className="divide-y">
              <BreakdownLine
                icon={<Wallet className="w-3.5 h-3.5" />}
                tone="slate"
                label="Apertura"
                amount={breakdown.opening}
              />
              <BreakdownLine
                icon={<Banknote className="w-3.5 h-3.5" />}
                tone="emerald"
                label="Pagos en efectivo"
                amount={breakdown.cashPayments}
                signed="+"
              />
              <BreakdownLine
                icon={<ArrowDownToLine className="w-3.5 h-3.5" />}
                tone="sky"
                label="Depósitos"
                amount={breakdown.deposits}
                signed="+"
              />
              <BreakdownLine
                icon={<ArrowUpFromLine className="w-3.5 h-3.5" />}
                tone="rose"
                label="Retiros"
                amount={breakdown.withdrawals}
                signed="-"
              />
              <div className="px-3 py-2.5 flex items-center justify-between bg-muted/40">
                <span className="text-sm font-bold">Total esperado</span>
                <span className="text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(breakdown.expected)}
                </span>
              </div>
            </div>
          </div>

          {/* Physical count: bill counter (default) or quick manual entry */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cash-physical">Conteo físico</Label>
              <div className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setEntry("count")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
                    counting ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Calculator className="size-3.5" />
                  Contar
                </button>
                <button
                  type="button"
                  onClick={() => setEntry("quick")}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium transition-colors",
                    !counting ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
                  )}
                >
                  <Pencil className="size-3.5" />
                  Monto
                </button>
              </div>
            </div>
            {counting ? (
              <CashCounter value={counted} onChange={setCounted} />
            ) : (
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  RD$
                </span>
                <input
                  id="cash-physical"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0.00"
                  className={cn(
                    "h-12 w-full rounded-lg border bg-transparent pl-12 pr-3 text-right text-xl font-bold tabular-nums tracking-tight outline-none transition-colors placeholder:text-muted-foreground/40 focus-visible:ring-3 focus-visible:ring-ring/50",
                    !hasAmount
                      ? "border-input focus-visible:border-ring"
                      : isMatch || isSurplus
                        ? "border-emerald-400 focus-visible:border-emerald-500"
                        : "border-rose-400 focus-visible:border-rose-500",
                  )}
                />
              </div>
            )}
          </div>

          {/* Close summary: expected / counted / difference (validation) */}
          {hasAmount && (
            <div className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b bg-muted/30 px-3 py-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Resumen de cierre
                </span>
              </div>
              <div className="divide-y">
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total esperado</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(breakdown.expected)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Total contado</span>
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(numericAmount)}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5",
                    isMatch || isSurplus
                      ? "bg-emerald-50 dark:bg-emerald-950/20"
                      : "bg-rose-50 dark:bg-rose-950/20",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    {isMatch ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4",
                          isSurplus
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400",
                        )}
                      />
                    )}
                    Diferencia
                  </span>
                  <span
                    className={cn(
                      "text-base font-bold tabular-nums",
                      isMatch || isSurplus
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-rose-700 dark:text-rose-400",
                    )}
                  >
                    {isMatch
                      ? formatCurrency(0)
                      : `${isSurplus ? "+" : "−"}${formatCurrency(absDifference)}`}
                  </span>
                </div>
              </div>
              {!isMatch && (
                <div
                  className={cn(
                    "px-3 py-1.5 text-xs",
                    isSurplus
                      ? "bg-emerald-50/60 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-300"
                      : "bg-rose-50/60 text-rose-700 dark:bg-rose-950/10 dark:text-rose-300",
                  )}
                >
                  {isSurplus ? "Sobra dinero en caja." : "Falta dinero en caja."} Justifica la
                  diferencia para poder cerrar.
                </div>
              )}
            </div>
          )}

          {/* Notes — justification becomes mandatory when there's a difference */}
          <div className="space-y-1.5">
            <Label htmlFor="cash-notes">
              {needsJustification ? "Justificación de la diferencia" : "Notas"}{" "}
              {needsJustification ? (
                <span
                  className={cn(
                    "font-normal",
                    justified ? "text-muted-foreground" : "text-rose-600",
                  )}
                >
                  · obligatoria
                </span>
              ) : (
                <span className="text-muted-foreground font-normal">· opcional</span>
              )}
            </Label>
            <textarea
              id="cash-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                needsJustification
                  ? "Explica el faltante o sobrante…"
                  : "Observaciones al cerrar la caja…"
              }
              rows={2}
              className={cn(
                "w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
                needsJustification && !justified
                  ? "border-rose-400 focus-visible:border-rose-500"
                  : "border-input focus-visible:border-ring",
              )}
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 px-5 py-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose} disabled={saving} size="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canClose}
            size="sm"
            className={cn(
              "min-w-[140px]",
              isMatch || isSurplus
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-rose-600 text-white hover:bg-rose-700",
            )}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Banknote className="w-4 h-4 mr-1.5" />
            )}
            {needsJustification ? "Cerrar con diferencia" : "Cerrar caja"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TONE_CLASSES: Record<
  "slate" | "emerald" | "sky" | "rose",
  { iconBg: string; iconText: string; amountText: string }
> = {
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconText: "text-slate-700 dark:text-slate-300",
    amountText: "text-foreground",
  },
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-950/40",
    iconText: "text-emerald-700 dark:text-emerald-300",
    amountText: "text-emerald-700 dark:text-emerald-400",
  },
  sky: {
    iconBg: "bg-sky-100 dark:bg-sky-950/40",
    iconText: "text-sky-700 dark:text-sky-300",
    amountText: "text-sky-700 dark:text-sky-400",
  },
  rose: {
    iconBg: "bg-rose-100 dark:bg-rose-950/40",
    iconText: "text-rose-700 dark:text-rose-300",
    amountText: "text-rose-700 dark:text-rose-400",
  },
};

function BreakdownLine({
  icon,
  tone,
  label,
  amount,
  signed,
}: {
  icon: React.ReactNode;
  tone: "slate" | "emerald" | "sky" | "rose";
  label: string;
  amount: number;
  signed?: "+" | "-";
}) {
  const cls = TONE_CLASSES[tone];
  const showSign = signed && amount !== 0;
  return (
    <div className="px-3 py-2 flex items-center gap-2.5">
      <span
        className={cn(
          "w-7 h-7 rounded-md flex items-center justify-center shrink-0",
          cls.iconBg,
          cls.iconText,
        )}
      >
        {icon}
      </span>
      <span className="text-sm flex-1">{label}</span>
      <span className={cn("text-sm font-semibold tabular-nums", cls.amountText)}>
        {showSign ? `${signed} ` : ""}
        {formatCurrency(amount)}
      </span>
    </div>
  );
}
