"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { collectInvoicePayment } from "@/lib/data/cash";
import { type PaymentInput } from "@/lib/data/billing";
import { formatPrice } from "@/lib/data/services";
import type { Invoice, PaymentMethod } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta crédito" },
  { value: "debit_card", label: "Tarjeta débito" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
];

export function QuickPayDialog({
  open,
  onOpenChange,
  tenantId,
  uid,
  sessionId,
  invoice,
  onPaid,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  uid?: string;
  sessionId?: string;
  invoice: Invoice | null;
  onPaid?: () => void;
}) {
  const remaining = invoice ? invoice.total - invoice.paidAmount : 0;

  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(remaining);
  const [tendered, setTendered] = useState(0);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const change = method === "cash" && tendered > 0 ? Math.max(0, tendered - amount) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !uid || !invoice || !sessionId) return;
    if (amount <= 0 || amount > remaining + 0.001) {
      toast.error("Monto inválido");
      return;
    }
    setSaving(true);
    try {
      const input: PaymentInput = {
        method,
        amount,
        amountTendered: method === "cash" ? tendered || amount : undefined,
        reference: reference.trim() || undefined,
      };
      const label = invoice.invoiceNumber || invoice.patientName || invoice.id.slice(0, 6);
      const result = await collectInvoicePayment({
        tenantId,
        sessionId,
        invoiceId: invoice.id,
        invoiceLabel: label,
        uid,
        input,
        currentPaid: invoice.paidAmount,
        invoiceTotal: invoice.total,
      });
      if (method === "cash" && result.changeGiven > 0) {
        toast.success(`Cobrado. Cambio: ${formatPrice(result.changeGiven)}`);
      } else {
        toast.success("Cobro registrado");
      }
      onPaid?.();
      onOpenChange(false);
    } catch {
      toast.error("No se pudo registrar el cobro");
    } finally {
      setSaving(false);
    }
  }

  if (!invoice) return null;

  const chips: { label: string; value: number }[] = [
    { label: "Total", value: remaining },
    { label: "50%", value: Math.round(remaining * 50) / 100 },
    { label: "100", value: 100 },
    { label: "500", value: 500 },
    { label: "1000", value: 1000 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cobrar</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* paciente + factura */}
          <div className="space-y-1 rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="font-medium">{invoice.patientName}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {invoice.invoiceNumber || `Cargo ${invoice.id.slice(0, 6)}`}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="Total" value={invoice.total} />
              <Stat label="Pagado" value={invoice.paidAmount} />
              <Stat label="Saldo" value={remaining} accent />
            </div>
          </div>

          {/* monto */}
          <div className="space-y-2">
            <Label htmlFor="qp-amount">Monto a cobrar</Label>
            <Input
              id="qp-amount"
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            <div className="flex flex-wrap gap-1.5">
              {chips.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => setAmount(Math.min(c.value, remaining))}
                  className="rounded-md border border-input px-2 py-0.5 text-xs font-medium hover:bg-muted"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* método */}
          <div className="space-y-2">
            <Label>Método</Label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    method === m.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {method === "cash" ? (
            <div className="space-y-2">
              <Label htmlFor="qp-tendered">Efectivo recibido</Label>
              <Input
                id="qp-tendered"
                type="number"
                min={amount}
                step="0.01"
                value={tendered || ""}
                placeholder={formatPrice(amount)}
                onChange={(e) => setTendered(parseFloat(e.target.value) || 0)}
              />
              {change > 0 && (
                <p className="text-sm font-medium text-green-600">
                  Cambio: {formatPrice(change)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="qp-ref">Referencia (opcional)</Label>
              <Input
                id="qp-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="N° de aprobación"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Cobrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={`font-semibold tabular-nums ${accent ? "text-primary" : ""}`}>
        {formatPrice(value)}
      </p>
    </div>
  );
}
