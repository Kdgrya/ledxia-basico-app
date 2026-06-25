import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type Query,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { registerPayment, type PaymentInput } from "@/lib/data/billing";

// Tipos

export type CashSessionStatus = "open" | "closed";

export type CashMovementType =
  | "open"
  | "payment"
  | "deposit"
  | "withdrawal"
  | "close";

export interface CashSession {
  id: string;
  status: CashSessionStatus;
  sessionCode?: string;
  openedAt: number;
  openedBy: string;
  openedByName: string;
  openingBalance: number;
  openingBreakdown?: Record<string, number>;
  currentBalance: number;
  closingBalance?: number;
  closingBreakdown?: Record<string, number>;
  expectedBalance?: number;
  difference?: number;
  closedAt?: number;
  closedBy?: string;
  notes?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CashMovement {
  id: string;
  sessionId: string;
  type: CashMovementType;
  amount: number;
  description: string;
  method?: string;
  invoiceId?: string;
  balanceAfter: number;
  userId: string;
  createdAt: number;
}

// Colecciones

export function cashSessionsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "cashSessions");
}

export function cashMovementsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "cashMovements");
}

// Lecturas

export function subscribeActiveSession(
  tenantId: string,
  cb: (session: CashSession | null) => void,
) {
  const q = query(
    cashSessionsCol(tenantId),
    where("status", "==", "open"),
    limit(1),
  ) as Query<DocumentData>;
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      cb(null);
      return;
    }
    const d = snap.docs[0];
    cb({ id: d.id, ...(d.data() as Omit<CashSession, "id">) });
  });
}

export function subscribeMovements(
  tenantId: string,
  sessionId: string,
  cb: (movements: CashMovement[]) => void,
  max = 15,
) {
  const q = query(
    cashMovementsCol(tenantId),
    where("sessionId", "==", sessionId),
    orderBy("createdAt", "desc"),
    limit(max),
  ) as Query<DocumentData>;
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CashMovement, "id">) })));
  });
}

// Contador de código de sesión. Vive en cashSessions para que cualquier miembro
// del tenant pueda incrementarlo (la colección `settings` es de escritura admin).
async function nextSessionCode(tenantId: string): Promise<string> {
  const counterRef = doc(db, "tenants", tenantId, "cashSessions", "_counter");
  let next = 1;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? (snap.data().current as number) : 0;
    next = current + 1;
    tx.set(counterRef, { current: next, _counter: true }, { merge: true });
  });
  return `CAJA-${String(next).padStart(6, "0")}`;
}

// Apertura

export async function openCashSession(
  tenantId: string,
  uid: string,
  name: string,
  openingBalance: number,
  breakdown?: Record<string, number>,
  notes?: string,
): Promise<string> {
  const sessionCode = await nextSessionCode(tenantId);
  const sessionRef = doc(cashSessionsCol(tenantId));
  const movementRef = doc(cashMovementsCol(tenantId));
  const now = Date.now();

  await runTransaction(db, async (tx) => {
    const sessionData: Omit<CashSession, "id"> = {
      status: "open",
      sessionCode,
      openedAt: now,
      openedBy: uid,
      openedByName: name,
      openingBalance,
      ...(breakdown ? { openingBreakdown: breakdown } : {}),
      currentBalance: openingBalance,
      ...(notes ? { notes } : {}),
    };
    tx.set(sessionRef, { ...sessionData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

    const movementData: Omit<CashMovement, "id"> = {
      sessionId: sessionRef.id,
      type: "open",
      amount: openingBalance,
      description: "Apertura de caja",
      balanceAfter: openingBalance,
      userId: uid,
      createdAt: now,
    };
    tx.set(movementRef, movementData);
  });

  return sessionRef.id;
}

// Movimientos (depósito / retiro / pago)

export interface MovementOptions {
  method?: string;
  invoiceId?: string;
}

export async function recordCashMovement(
  tenantId: string,
  sessionId: string,
  uid: string,
  type: Exclude<CashMovementType, "open" | "close">,
  amount: number,
  description: string,
  opts?: MovementOptions,
): Promise<number> {
  const sessionRef = doc(db, "tenants", tenantId, "cashSessions", sessionId);
  const movementRef = doc(cashMovementsCol(tenantId));
  const now = Date.now();
  let balanceAfter = 0;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error("session-not-found");
    const data = snap.data() as CashSession;
    if (data.status !== "open") throw new Error("session-closed");

    const delta = type === "withdrawal" ? -amount : amount;
    balanceAfter = (data.currentBalance ?? 0) + delta;

    tx.update(sessionRef, {
      currentBalance: balanceAfter,
      updatedAt: serverTimestamp(),
    });

    const movementData: Omit<CashMovement, "id"> = {
      sessionId,
      type,
      amount,
      description,
      ...(opts?.method ? { method: opts.method } : {}),
      ...(opts?.invoiceId ? { invoiceId: opts.invoiceId } : {}),
      balanceAfter,
      userId: uid,
      createdAt: now,
    };
    tx.set(movementRef, movementData);
  });

  return balanceAfter;
}

// Cierre

export async function closeCashSession(
  tenantId: string,
  sessionId: string,
  uid: string,
  closingBalance: number,
  breakdown: Record<string, number> | undefined,
  expectedBalance: number,
  notes?: string,
): Promise<void> {
  const sessionRef = doc(db, "tenants", tenantId, "cashSessions", sessionId);
  const movementRef = doc(cashMovementsCol(tenantId));
  const now = Date.now();
  const difference = closingBalance - expectedBalance;

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(sessionRef);
    if (!snap.exists()) throw new Error("session-not-found");
    if ((snap.data() as CashSession).status !== "open") throw new Error("already-closed");

    tx.update(sessionRef, {
      status: "closed",
      closingBalance,
      ...(breakdown ? { closingBreakdown: breakdown } : {}),
      expectedBalance,
      difference,
      closedAt: now,
      closedBy: uid,
      ...(notes ? { notes } : {}),
      updatedAt: serverTimestamp(),
    });

    const movementData: Omit<CashMovement, "id"> = {
      sessionId,
      type: "close",
      amount: closingBalance,
      description: "Cierre de caja",
      balanceAfter: closingBalance,
      userId: uid,
      createdAt: now,
    };
    tx.set(movementRef, movementData);
  });
}

// Totales

export interface SessionTotals {
  cashPayments: number;
  deposits: number;
  withdrawals: number;
  paymentCount: number;
}

// Solo los pagos en efectivo cuentan para el balance esperado de la caja.
export function computeTotals(movements: CashMovement[]): SessionTotals {
  let cashPayments = 0;
  let deposits = 0;
  let withdrawals = 0;
  let paymentCount = 0;
  for (const m of movements) {
    if (m.type === "payment") {
      paymentCount += 1;
      if (m.method === "cash" || !m.method) cashPayments += m.amount;
    } else if (m.type === "deposit") {
      deposits += m.amount;
    } else if (m.type === "withdrawal") {
      withdrawals += m.amount;
    }
  }
  return { cashPayments, deposits, withdrawals, paymentCount };
}

// Registra el pago de la factura y lo refleja en la sesión de caja activa.
// Solo el efectivo mueve la caja, pero todo pago queda en el historial.
export async function collectInvoicePayment(args: {
  tenantId: string;
  sessionId: string;
  invoiceId: string;
  invoiceLabel: string;
  uid: string;
  input: PaymentInput;
  currentPaid: number;
  invoiceTotal: number;
}): Promise<{ changeGiven: number; newStatus: string }> {
  const { tenantId, sessionId, invoiceId, invoiceLabel, uid, input, currentPaid, invoiceTotal } = args;

  const result = await registerPayment(tenantId, invoiceId, uid, input, currentPaid, invoiceTotal);

  // Reflejar en la caja. Los métodos no-efectivo se registran pero no mueven el total.
  await recordCashMovement(
    tenantId,
    sessionId,
    uid,
    "payment",
    input.method === "cash" ? input.amount : 0,
    `Cobro · ${invoiceLabel}`,
    { method: input.method, invoiceId },
  );

  return result;
}

// Etiquetas

export const MOVEMENT_LABEL: Record<CashMovementType, string> = {
  open: "Apertura",
  payment: "Cobro",
  deposit: "Depósito",
  withdrawal: "Retiro",
  close: "Cierre",
};
