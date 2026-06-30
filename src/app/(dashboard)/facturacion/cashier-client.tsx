"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Wallet,
  Loader2,
  Banknote,
  FileText,
  LockKeyhole,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  Route,
} from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { subscribeInvoices } from "@/lib/data/billing";
import {
  subscribeActiveSession,
  subscribeMovements,
  computeTotals,
  recordCashMovement,
  MOVEMENT_LABEL,
  type CashSession,
  type CashMovement,
} from "@/lib/data/cash";
import { formatPrice } from "@/lib/data/services";
import type { Invoice } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { FULButton } from "@/components/ui/FULButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OpenCashDialog } from "@/components/cash/open-cash-dialog";
import { CloseCashDialog } from "@/components/cash/close-cash-dialog";
import { QuickPayDialog } from "@/components/cash/quick-pay-dialog";
import { useRouter } from "next/navigation";

export function CashierClient() {
  const { tenantId, user, displayName } = useAuth();
  const uid = user?.uid;

  const [session, setSession] = useState<CashSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [moveDialog, setMoveDialog] = useState<null | "deposit" | "withdrawal">(null);

  const router = useRouter();

  useEffect(() => {
    if (!tenantId) return;
    return subscribeActiveSession(tenantId, (s) => {
      setSession(s);
      setSessionLoaded(true);
    });
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    return subscribeInvoices(tenantId, setInvoices);
  }, [tenantId]);

  const sessionId = session?.id;
  useEffect(() => {
    if (!tenantId || !sessionId) return;
    return subscribeMovements(tenantId, sessionId, setMovements);
  }, [tenantId, sessionId]);

  const pendingInvoices = useMemo(
    () =>
      invoices.filter(
        (inv) => inv.status === "pending" || inv.status === "partial",
      ),
    [invoices],
  );

  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const totals = useMemo(() => computeTotals(movements), [movements]);

  const kpis = useMemo(() => {
    let toCollect = 0;
    let invoicesToday = 0;
    for (const inv of invoices) {
      if (inv.status === "cancelled") continue;
      if (inv.issuedAt >= todayStart) invoicesToday += 1;
      if (inv.status === "pending" || inv.status === "partial") {
        toCollect += inv.total - inv.paidAmount;
      }
    }
    // Cobrado hoy = todos los cobros registrados en el feed.
    const collectedToday = movements
      .filter((m) => m.type === "payment")
      .reduce((s, m) => s + m.amount, 0);
    return { collectedToday, toCollect, invoicesToday };
  }, [invoices, movements, todayStart]);

  const openFirstPending = useCallback(() => {
    if (pendingInvoices.length > 0) setPayInvoice(pendingInvoices[0]);
  }, [pendingInvoices]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "F1") {
        e.preventDefault();
        if (session) openFirstPending();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (session) setCloseDialog(true);
        else setOpenDialog(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, openFirstPending]);

  if (!sessionLoaded) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Caja cerrada
  if (!session) {
    return (
      <>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">
              Bienvenido/a, {displayName ?? "cajero/a"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Antes de cobrar debes abrir tu turno de caja.
            </p>
          </div>
          <Button size="lg" onClick={() => setOpenDialog(true)}>
            <Wallet className="mr-2 h-5 w-5" /> Abrir caja
          </Button>
        </div>

        <OpenCashDialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          onSuccess={() => setOpenDialog(false)}
        />
      </>
    );
  }

  // Caja abierta
  const elapsed = formatElapsed(session.openedAt);
  

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-green-600">CAJA ABIERTA</p>
              <p className="text-xs text-muted-foreground">
                {session.openedByName} · {session.sessionCode} · {elapsed}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Cobrado hoy" value={formatPrice(kpis.collectedToday)} accent />
          <Kpi label="Por cobrar" value={formatPrice(kpis.toCollect)} />
          <Kpi label="Facturas hoy" value={String(kpis.invoicesToday)} />
        </div>

        <div>
          <div className="flex flex-wrap gap-4">
            <FULButton action={openFirstPending} label="Cobrar" color="#1c7253" />
            <FULButton label="Facturas" action={() => router.push('facturacion/lista')} color="#0164ac"/>
            <FULButton label="Cerrar Caja" action={() => setCloseDialog(true)} color="#2c4153"/>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Facturas por cobrar</h3>
              <span className="text-xs text-muted-foreground">{pendingInvoices.length}</span>
            </div>
            <div className="space-y-2">
              {pendingInvoices.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No hay facturas pendientes de cobro.
                </div>
              ) : (
                pendingInvoices.map((inv) => {
                  const remaining = inv.total - inv.paidAmount;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{inv.patientName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {inv.invoiceNumber || `Cargo ${inv.id.slice(0, 6)}`}
                          {inv.status === "partial" && " · parcial"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold tabular-nums">{formatPrice(remaining)}</span>
                        <Button size="sm" onClick={() => setPayInvoice(inv)}>
                          Cobrar
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div>
            
            <div className="rounded-xl border bg-card p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Activity className="h-3.5 w-3.5" /> Actividad reciente
              </p>
              {movements.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sin movimientos.</p>
              ) : (
                <ul className="space-y-2">
                  {movements.map((m) => (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium">
                          {MOVEMENT_LABEL[m.type]}
                          {m.description && m.type === "payment" ? "" : ""}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {new Date(m.createdAt).toLocaleTimeString("es-DO", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {m.description ? ` · ${m.description}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 text-xs font-semibold tabular-nums ${
                          m.type === "withdrawal"
                            ? "text-destructive"
                            : m.type === "close"
                              ? "text-muted-foreground"
                              : "text-green-600"
                        }`}
                      >
                        {m.type === "withdrawal" ? "−" : "+"}
                        {formatPrice(m.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuickPayDialog
        key={payInvoice ? `${payInvoice.id}:${payInvoice.paidAmount}` : "none"}
        open={payInvoice != null}
        onOpenChange={(v) => !v && setPayInvoice(null)}
        tenantId={tenantId}
        uid={uid}
        sessionId={session.id}
        invoice={payInvoice}
      />

      <CloseCashDialog
        open={closeDialog}
        onClose={() => setCloseDialog(false)}
        session={session}
        movements={movements}
        onSuccess={() => setCloseDialog(false)}
      />

      <CashMoveDialog
        kind={moveDialog}
        onOpenChange={(v) => !v && setMoveDialog(null)}
        tenantId={tenantId}
        uid={uid}
        sessionId={session.id}
      />
    </>
  );
}

function CashMoveDialog({
  kind,
  onOpenChange,
  tenantId,
  uid,
  sessionId,
}: {
  kind: "deposit" | "withdrawal" | null;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  uid?: string;
  sessionId: string;
}) {
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const isDeposit = kind === "deposit";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !uid || !kind) return;
    if (amount <= 0) {
      toast.error("Monto inválido");
      return;
    }
    setSaving(true);
    try {
      await recordCashMovement(
        tenantId,
        sessionId,
        uid,
        kind,
        amount,
        description.trim() || (isDeposit ? "Depósito" : "Retiro"),
      );
      toast.success(isDeposit ? "Depósito registrado" : "Retiro registrado");
      setAmount(0);
      setDescription("");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo registrar el movimiento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={kind != null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isDeposit ? "Depositar en caja" : "Retirar de caja"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mv-amount">Monto (RD$)</Label>
            <Input
              id="mv-amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount || ""}
              placeholder="0.00"
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mv-desc">Descripción (opcional)</Label>
            <Input
              id="mv-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isDeposit ? "Ej. Fondo adicional" : "Ej. Pago a proveedor"}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDeposit ? "Depositar" : "Retirar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${accent ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

function formatElapsed(since: number): string {
  const ms = Date.now() - since;
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "recién abierta";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
