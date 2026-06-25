"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Loader2,
  Printer,
  RefreshCw,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/context";
import {
  subscribeInvoice,
  getPaymentsForInvoice,
  registerPayment,
  cancelInvoice,
  STATUS_LABEL,
  STATUS_VARIANT,
  METHOD_LABEL,
  type PaymentInput,
} from "@/lib/data/billing";
import { formatPrice } from "@/lib/data/services";
import { submitEcfFn, createPrintJobFn } from "@/lib/firebase/functions";
import { subscribePrinters, type Printer as PrinterType } from "@/lib/data/printing";
import { ECF_STATUS_LABEL, ECF_STATUS_VARIANT } from "@/lib/data/ecf";
import type { Invoice, Payment, PaymentMethod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "credit_card", label: "Tarjeta crédito" },
  { value: "debit_card", label: "Tarjeta débito" },
  { value: "transfer", label: "Transferencia" },
  { value: "check", label: "Cheque" },
];

export function InvoiceDetailClient({ invoiceId }: { invoiceId: string }) {
  const { tenantId, user } = useAuth();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const paidAmount = invoice?.paidAmount;

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribeInvoice(tenantId, invoiceId, (inv) => {
      setInvoice(inv);
      setLoading(false);
    });
    return unsub;
  }, [tenantId, invoiceId]);

  useEffect(() => {
    if (!tenantId || paidAmount == null) return;
    getPaymentsForInvoice(tenantId, invoiceId).then(setPayments);
  }, [tenantId, invoiceId, paidAmount]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
        <AlertTriangle className="h-8 w-8" />
        <p>Factura no encontrada.</p>
        <Button variant="outline" render={<Link href="/facturacion/lista" />}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const remaining = invoice.total - invoice.paidAmount;
  const isClosed = invoice.status === "paid" || invoice.status === "cancelled";
  const isFiscal = invoice.fiscalRegime === "fiscal" && invoice.status !== "cancelled";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" render={<Link href="/facturacion/lista" />}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Facturas
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {invoice.invoiceNumber ?? "Cargo sin número"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {invoice.patientName} ·{" "}
            {new Date(invoice.issuedAt).toLocaleDateString("es-DO", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge variant={STATUS_VARIANT[invoice.status]} className="text-sm">
          {STATUS_LABEL[invoice.status]}
        </Badge>
      </div>

      {isFiscal && (
        <EcfSection
          invoiceId={invoiceId}
          tenantId={tenantId}
          ecf={invoice.ecf}
        />
      )}

      <section className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio</TableHead>
              <TableHead className="text-center">Cant.</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="text-right">ITBIS</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item, i) => (
              <TableRow key={i}>
                <TableCell className="font-medium">{item.description}</TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-right">{formatPrice(item.unitPrice)}</TableCell>
                <TableCell className="text-right">
                  {item.taxRate > 0 ? formatPrice(item.taxAmount) : "—"}
                </TableCell>
                <TableCell className="text-right font-medium">{formatPrice(item.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t px-4 py-3 space-y-1 text-sm text-right">
          <div className="flex justify-end gap-12 text-muted-foreground">
            <span>Subtotal</span>
            <span className="w-24">{formatPrice(invoice.subtotal)}</span>
          </div>
          {invoice.taxAmount > 0 && (
            <div className="flex justify-end gap-12 text-muted-foreground">
              <span>ITBIS</span>
              <span className="w-24">{formatPrice(invoice.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-end gap-12 font-semibold text-base border-t pt-1 mt-1">
            <span>Total</span>
            <span className="w-24">{formatPrice(invoice.total)}</span>
          </div>
        </div>
      </section>

      {payments.length > 0 && (
        <section className="space-y-2">
          <h3 className="font-semibold text-sm">Pagos registrados</h3>
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Método</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Cambio</TableHead>
                  <TableHead>Ref.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{METHOD_LABEL[p.method]}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(p.paidAt).toLocaleDateString("es-DO")}
                    </TableCell>
                    <TableCell className="text-right">{formatPrice(p.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {p.changeGiven ? formatPrice(p.changeGiven) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.reference || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {!isClosed && (
        <section className="rounded-lg border bg-muted/30 p-4 space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pagado</span>
            <span>{formatPrice(invoice.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Pendiente</span>
            <span className="text-primary">{formatPrice(remaining)}</span>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPayOpen(true)}>
              Registrar pago
            </Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => setCancelOpen(true)}
            >
              Anular
            </Button>
          </div>
        </section>
      )}

      {invoice.status === "cancelled" && invoice.cancellationReason && (
        <p className="text-sm text-muted-foreground">
          Motivo de anulación: {invoice.cancellationReason}
        </p>
      )}

      {invoice.status === "paid" && (
        <PrintSection invoiceId={invoiceId} tenantId={tenantId} />
      )}

      <PaymentDialog
        key={`${invoice.id}:${remaining}`}
        open={payOpen}
        onOpenChange={setPayOpen}
        remaining={remaining}
        tenantId={tenantId}
        invoiceId={invoiceId}
        uid={user?.uid}
        currentPaid={invoice.paidAmount}
        invoiceTotal={invoice.total}
        onSuccess={() => {
          setPayOpen(false);
          router.refresh();
        }}
      />

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        tenantId={tenantId}
        invoiceId={invoiceId}
        uid={user?.uid}
        onSuccess={() => {
          setCancelOpen(false);
          router.push("/facturacion/lista");
        }}
      />
    </div>
  );
}

function PrintSection({
  invoiceId,
  tenantId,
}: {
  invoiceId: string;
  tenantId?: string;
}) {
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribePrinters(tenantId, (list) => {
      const active = list.filter((p) => p.active);
      setPrinters(active);
      if (active.length > 0 && !selectedPrinter) {
        setSelectedPrinter(active[0].id);
      }
    });
    return unsub;
  }, [tenantId, selectedPrinter]);

  if (printers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 flex items-center gap-3 text-sm text-muted-foreground">
        <Printer className="h-4 w-4 flex-none" />
        <span>
          No hay impresoras activas.{" "}
          <Link href="/configuracion/impresion" className="underline underline-offset-2 hover:text-foreground transition-colors">
            Configura una en Configuración
          </Link>
          .
        </span>
      </div>
    );
  }

  async function handlePrint() {
    if (!tenantId || !selectedPrinter) return;
    setPrinting(true);
    toast("Enviando a impresora…");
    try {
      await createPrintJobFn({ invoiceId, printerId: selectedPrinter });
      toast.success("Trabajo enviado");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`No se pudo enviar: ${msg}`);
    } finally {
      setPrinting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/20 p-4 flex items-center gap-3 flex-wrap">
      <Printer className="h-4 w-4 flex-none text-muted-foreground" />
      <select
        className="flex-1 h-9 min-w-[160px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        value={selectedPrinter}
        onChange={(e) => setSelectedPrinter(e.target.value)}
      >
        {printers.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={handlePrint} disabled={printing || !selectedPrinter}>
        {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
        Imprimir recibo
      </Button>
    </div>
  );
}

function PaymentDialog({
  open,
  onOpenChange,
  remaining,
  tenantId,
  invoiceId,
  uid,
  currentPaid,
  invoiceTotal,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  remaining: number;
  tenantId?: string;
  invoiceId: string;
  uid?: string;
  currentPaid: number;
  invoiceTotal: number;
  onSuccess: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [amount, setAmount] = useState(remaining);
  const [tendered, setTendered] = useState(0);
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);

  const change = method === "cash" && tendered > 0 ? Math.max(0, tendered - amount) : 0;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !uid) return;
    if (amount <= 0 || amount > remaining) {
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
      const result = await registerPayment(tenantId, invoiceId, uid, input, currentPaid, invoiceTotal);
      if (method === "cash" && result.changeGiven > 0) {
        toast.success(`Pago registrado. Cambio: ${formatPrice(result.changeGiven)}`);
      } else {
        toast.success("Pago registrado");
      }
      onSuccess();
    } catch {
      toast.error("No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Método de pago</Label>
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

          <div className="space-y-2">
            <Label htmlFor="pay-amount">
              Monto a pagar (pendiente: {formatPrice(remaining)})
            </Label>
            <Input
              id="pay-amount"
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          {method === "cash" && (
            <div className="space-y-2">
              <Label htmlFor="pay-tendered">Efectivo recibido</Label>
              <Input
                id="pay-tendered"
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
          )}

          {method !== "cash" && (
            <div className="space-y-2">
              <Label htmlFor="pay-ref">Referencia (opcional)</Label>
              <Input
                id="pay-ref"
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
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EcfSection({
  invoiceId,
  tenantId,
  ecf,
}: {
  invoiceId: string;
  tenantId?: string;
  ecf?: Invoice["ecf"];
}) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!tenantId) return;
    setSubmitting(true);
    try {
      const res = await submitEcfFn({ invoiceId });
      const { encf, status } = res.data;
      if (status === "error") {
        toast.error("No se pudo transmitir a la DGII. Verifica los Ajustes e-CF.");
      } else {
        toast.success(`eNCF asignado: ${encf}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (!ecf?.ncf) {
    return (
      <div className="rounded-lg border border-dashed p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Comprobante Fiscal Electrónico</p>
          <p className="text-xs text-muted-foreground">
            Esta factura es fiscal. Asigna un eNCF y transmítela a la DGII.
          </p>
        </div>
        <Button size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Asignar e-CF y transmitir
        </Button>
      </div>
    );
  }

  const status = ecf.status ?? "pending";
  const isError = status === "rejected" || status === "error";

  return (
    <div className="rounded-lg border bg-background p-4 space-y-2">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-0.5">
            e-CF / DGII
          </p>
          <p className="font-mono font-semibold">{ecf.ncf}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={ECF_STATUS_VARIANT[status] ?? "secondary"}>
            {ECF_STATUS_LABEL[status] ?? status}
          </Badge>
          {isError && (
            <Button size="sm" variant="outline" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reintentar
            </Button>
          )}
        </div>
      </div>
      {ecf.trackId && (
        <p className="text-xs text-muted-foreground">
          Track ID: <span className="font-mono">{ecf.trackId}</span>
        </p>
      )}
      {ecf.message && isError && (
        <p className="text-xs text-destructive">{ecf.message}</p>
      )}
    </div>
  );
}

function CancelDialog({
  open,
  onOpenChange,
  tenantId,
  invoiceId,
  uid,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  invoiceId: string;
  uid?: string;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !uid || !reason.trim()) return;
    setSaving(true);
    try {
      await cancelInvoice(tenantId, invoiceId, uid, reason.trim());
      toast.success("Factura anulada");
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(msg === "already-cancelled" ? "Ya está anulada" : "No se pudo anular");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Anular factura</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. Indica el motivo de anulación.
          </p>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">Motivo</Label>
            <Input
              id="cancel-reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Error en servicios"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Volver
            </Button>
            <Button type="submit" variant="destructive" disabled={saving || !reason.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Anular
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
