import { httpsCallable} from "firebase/functions";
import { functions } from "./client";
import type { ModuleKey } from "@/lib/modules";
import { Key } from "lucide-react";
import { request } from "http";

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


interface xlsxpayload {
  configData: {
    items?: Record<string, unknown>[];
    theme?: string;
    notificationsEnabled?: boolean;
    [key: string]: any;
  };
}

interface xlsxResponse {
  success: boolean;
  message: string;
}

export const xlsxSavecnfgFn = httpsCallable<xlsxpayload,xlsxResponse>
(functions, "xlsxSavecnfg");

async function xlsxSave(data: Record<string, unknown>[]) {
  try {
    const payload: xlsxpayload = {
      configData: {
        theme: "dark",
        notificationsEnabled: true
      }
    };

    const result = await xlsxSavecnfgFn(payload);
    
  } catch (error) {
    console.error("Error calling cloud function:", error);
  }
}