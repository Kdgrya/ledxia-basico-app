"use client";

import { useState } from "react";
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
import { openCashSession } from "@/lib/data/cash";
import { useAuth } from "@/lib/auth/context";
import { CashCounter } from "@/components/cash/cash-counter";
import { sumBreakdown, type CashBreakdown } from "@/lib/cash-denominations";
import { toast } from "sonner";
import { Loader2, Calculator, Pencil } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    maximumFractionDigits: 0,
  }).format(value);

interface OpenCashDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function OpenCashDialog({ open, onClose, onSuccess }: OpenCashDialogProps) {
  const { tenantId, user, displayName } = useAuth();

  const [amount, setAmount] = useState("");
  const [breakdown, setBreakdown] = useState<CashBreakdown>({});
  const [entry, setEntry] = useState<"count" | "quick">("count");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const counting = entry === "count";
  const numericAmount = counting ? sumBreakdown(breakdown) : Number(amount) || 0;

  function handleAmountChange(raw: string) {
    setAmount(raw.replace(/[^0-9]/g, ""));
  }

  function resetAndClose() {
    setAmount("");
    setBreakdown({});
    setEntry("count");
    setNotes("");
    onClose();
  }

  async function handleSubmit() {
    if (!tenantId || !user) return;
    if (numericAmount <= 0) {
      toast.error("El monto de apertura debe ser mayor a 0");
      return;
    }
    setSaving(true);
    try {
      await openCashSession(
        tenantId,
        user.uid,
        displayName ?? user.email ?? "Cajero/a",
        numericAmount,
        // Only send a breakdown when counting; the backend then treats its sum
        // as the authoritative opening balance.
        counting && numericAmount > 0 ? breakdown : undefined,
        notes || undefined,
      );
      toast.success("Caja abierta exitosamente");
      resetAndClose();
      onSuccess();
    } catch {
      toast.error("No se pudo abrir la caja");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      {/* Anchored near the top with bottom room, header/footer fixed, body
          scrolls — footer always usable. */}
      <DialogContent className="top-[4vh] flex max-h-[86vh] translate-y-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-5 pt-5 pb-3">
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Cuenta tu fondo inicial y abre la sesión. Se le asignará un número correlativo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Opening amount: bill counter (default) or quick manual entry */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Monto de apertura</Label>
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
              <CashCounter value={breakdown} onChange={setBreakdown} />
            ) : (
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  RD$
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount ? Number(amount).toLocaleString("es-DO") : ""}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0"
                  className="h-14 w-full rounded-xl border border-input bg-transparent pl-14 pr-4 text-right text-2xl font-bold tabular-nums tracking-tight outline-none transition-colors placeholder:text-muted-foreground/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                />
              </div>
            )}
            {numericAmount > 0 && (
              <p className="text-right text-xs text-muted-foreground">
                Apertura: {formatCurrency(numericAmount)}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones al abrir la caja..."
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 border-t px-5 py-4">
          <Button variant="outline" onClick={resetAndClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || numericAmount <= 0}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Abrir caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
