import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { InvoiceItem, InvoiceStatus, FiscalRegime } from "@/lib/types";
import type { Service } from "@/lib/types";

export interface ChargeInput {
  patientId: string;
  patientName: string;
  // Presente cuando se factura a una empresa.
  companyId?: string;
  companyName?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  issuedBy: string;
  fiscalRegime: FiscalRegime;
  notes?: string;
}

export function buildItem(service: Service, quantity: number): InvoiceItem {
  const taxAmount = (service.price * quantity * service.taxRate) / 100;
  const total = service.price * quantity + taxAmount;
  return {
    description: service.name,
    quantity,
    unitPrice: service.price,
    taxRate: service.taxRate,
    taxAmount,
    discount: 0,
    total,
  };
}

export function calcTotals(items: InvoiceItem[]) {
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);
  const discount = items.reduce((s, i) => s + i.discount, 0);
  const total = items.reduce((s, i) => s + i.total, 0);
  return { subtotal, taxAmount, discount, total };
}

export async function createCharge(tenantId: string, uid: string, input: ChargeInput) {
  const status: InvoiceStatus = "pending";
  // Firestore rejects `undefined` values — drop any optional fields left unset.
  const clean = Object.fromEntries(
    Object.entries(input).filter(([, v]) => v !== undefined),
  ) as ChargeInput;
  return addDoc(collection(db, "tenants", tenantId, "invoices"), {
    ...clean,
    paidAmount: 0,
    status,
    issuedAt: Date.now(),
    issuedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
