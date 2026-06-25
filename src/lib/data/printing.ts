import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

// Tipos

export interface Printer {
  id: string;
  name: string;
  connection: "network" | "usb" | "system";
  ipAddress?: string;
  port?: number;
  hasCashDrawer: boolean;
  active: boolean;
}

export interface PrintJob {
  id: string;
  documentType: string;
  status: "pending" | "printing" | "done" | "failed";
  printerId: string;
  copies: number;
  openCashDrawer: boolean;
  error?: string;
  createdAt?: number;
  processedAt?: number;
}

export type PrinterInput = {
  name: string;
  connection: "network" | "usb" | "system";
  ipAddress?: string;
  port?: number;
  hasCashDrawer: boolean;
};

// Colecciones

export function printersCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "printers");
}

export function printJobsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "printJobs");
}

// Escrituras

export async function createPrinter(
  tenantId: string,
  input: PrinterInput,
): Promise<string> {
  const ref = await addDoc(printersCol(tenantId), {
    ...input,
    active: true,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updatePrinter(
  tenantId: string,
  id: string,
  input: Partial<PrinterInput & { active: boolean }>,
): Promise<void> {
  await updateDoc(doc(db, "tenants", tenantId, "printers", id), {
    ...input,
    updatedAt: Date.now(),
  });
}

// Suscripciones

export function subscribePrinters(
  tenantId: string,
  cb: (printers: Printer[]) => void,
) {
  return onSnapshot(printersCol(tenantId), (snap) => {
    cb(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Printer, "id">),
      })),
    );
  });
}

export function subscribePrintJobs(
  tenantId: string,
  cb: (jobs: PrintJob[]) => void,
) {
  const q = query(printJobsCol(tenantId), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.slice(0, 50).map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PrintJob, "id">),
      })),
    );
  });
}
