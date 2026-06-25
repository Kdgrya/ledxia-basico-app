import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Invoice, Payment, PaymentMethod } from "@/lib/types";

// Colecciones

export function invoicesCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "invoices");
}

export function paymentsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "payments");
}

// Lecturas

export async function getInvoice(tenantId: string, invoiceId: string): Promise<Invoice | null> {
  const snap = await getDoc(doc(db, "tenants", tenantId, "invoices", invoiceId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Invoice, "id">) };
}

export function subscribeInvoice(
  tenantId: string,
  invoiceId: string,
  cb: (inv: Invoice | null) => void,
) {
  return onSnapshot(doc(db, "tenants", tenantId, "invoices", invoiceId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...(snap.data() as Omit<Invoice, "id">) } : null);
  });
}

export function subscribeInvoices(
  tenantId: string,
  cb: (invs: Invoice[]) => void,
) {
  const q = query(invoicesCol(tenantId), orderBy("issuedAt", "desc")) as Query<DocumentData>;
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invoice, "id">) })));
  });
}

export async function getPaymentsForInvoice(
  tenantId: string,
  invoiceId: string,
): Promise<Payment[]> {
  const q = query(
    paymentsCol(tenantId),
    orderBy("paidAt", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Payment, "id">) }))
    .filter((p) => p.invoiceId === invoiceId);
}

// Número de factura

async function nextInvoiceNumber(tenantId: string): Promise<string> {
  const counterRef = doc(db, "tenants", tenantId, "settings", "invoiceCounter");
  let next = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().current as number) : 0;
    next = current + 1;
    tx.set(counterRef, { current: next }, { merge: true });
  });
  return `FAC-${String(next).padStart(6, "0")}`;
}

// Pagos

export interface PaymentInput {
  method: PaymentMethod;
  amount: number;
  amountTendered?: number; // solo efectivo
  reference?: string;
}

export async function registerPayment(
  tenantId: string,
  invoiceId: string,
  uid: string,
  input: PaymentInput,
  currentPaid: number,
  invoiceTotal: number,
) {
  const invoiceRef = doc(db, "tenants", tenantId, "invoices", invoiceId);
  const paymentRef = doc(paymentsCol(tenantId));

  const newPaid = currentPaid + input.amount;
  const newStatus = newPaid >= invoiceTotal ? "paid" : "partial";
  const changeGiven =
    input.method === "cash" && input.amountTendered != null
      ? Math.max(0, input.amountTendered - input.amount)
      : 0;

  // Assign invoice number on first payment
  let invoiceNumber: string | undefined;
  if (currentPaid === 0) {
    invoiceNumber = await nextInvoiceNumber(tenantId);
  }

  await runTransaction(db, async (tx) => {
    const invSnap = await tx.get(invoiceRef);
    if (!invSnap.exists()) throw new Error("invoice-not-found");

    const paymentData: Omit<Payment, "id"> = {
      invoiceId,
      amount: input.amount,
      method: input.method,
      amountTendered: input.amountTendered,
      changeGiven,
      currency: "DOP",
      reference: input.reference,
      receivedBy: uid,
      paidAt: Date.now(),
    };

    tx.set(paymentRef, { ...paymentData, createdAt: serverTimestamp() });
    tx.update(invoiceRef, {
      paidAmount: newPaid,
      status: newStatus,
      ...(invoiceNumber ? { invoiceNumber } : {}),
      updatedAt: serverTimestamp(),
    });
  });

  return { changeGiven, newStatus };
}

// Anulación

export async function cancelInvoice(
  tenantId: string,
  invoiceId: string,
  uid: string,
  reason: string,
) {
  await runTransaction(db, async (tx) => {
    const ref = doc(db, "tenants", tenantId, "invoices", invoiceId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("not-found");
    if (snap.data().status === "cancelled") throw new Error("already-cancelled");
    tx.update(ref, {
      status: "cancelled",
      cancelledAt: Date.now(),
      cancelledBy: uid,
      cancellationReason: reason,
      updatedAt: serverTimestamp(),
    });
  });
}

// Helpers

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  paid: "Pagada",
  cancelled: "Anulada",
};

export const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  partial: "outline",
  paid: "default",
  cancelled: "destructive",
};

export const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  credit_card: "Tarjeta crédito",
  debit_card: "Tarjeta débito",
  transfer: "Transferencia",
  check: "Cheque",
};
