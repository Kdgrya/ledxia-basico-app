import { httpsCallable } from "firebase/functions";
import { functions } from "./client";
import type { ModuleKey } from "@/lib/modules";

// Wrappers tipados de las Cloud Functions callable.
export const createUserFn = httpsCallable<
  {
    email: string;
    password: string;
    displayName: string;
    role: string;
    permissions?: ModuleKey[];
  },
  { uid: string }
>(functions, "createUser");

export const updateUserFn = httpsCallable<
  {
    uid: string;
    role?: string;
    permissions?: ModuleKey[];
    active?: boolean;
    displayName?: string;
  },
  { ok: boolean }
>(functions, "updateUser");

// e-CF
export const saveEcfConfigFn = httpsCallable<
  { rnc: string; businessName: string; environment: string },
  { ok: boolean }
>(functions, "saveEcfConfig");

export const uploadCertificateFn = httpsCallable<
  { certBase64: string; passphrase: string },
  { ok: boolean; certExpiresAt: string | null }
>(functions, "uploadCertificate");

export const activateEcfFn = httpsCallable<
  { isActive: boolean },
  { ok: boolean }
>(functions, "activateEcf");

export const submitEcfFn = httpsCallable<
  { invoiceId: string },
  { encf: string; trackId: string | null; status: string }
>(functions, "submitEcf");

// Impresión
export const createPrintJobFn = httpsCallable<
  { invoiceId: string; printerId: string; copies?: number; openCashDrawer?: boolean },
  { jobId: string }
>(functions, "createPrintJob");

export const reportPrintResultFn = httpsCallable<
  { jobId: string; status: "done" | "failed"; error?: string },
  { ok: boolean }
>(functions, "reportPrintResult");
