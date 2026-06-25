import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface ClinicProfile {
  name: string;
  subtitle?: string;
  logoUrl?: string;
  primaryColor?: string; // hex, e.g. "#2563eb"
  phone?: string;
  address?: string;
  rnc?: string;
  updatedAt?: number;
}

export type ProfileInput = Omit<ClinicProfile, "updatedAt">;

export function profileRef(tenantId: string) {
  return doc(db, "tenants", tenantId, "settings", "profile");
}

export function subscribeProfile(
  tenantId: string,
  cb: (profile: ClinicProfile | null) => void,
) {
  return onSnapshot(profileRef(tenantId), (snap) => {
    cb(snap.exists() ? (snap.data() as ClinicProfile) : null);
  });
}

export async function saveProfile(tenantId: string, input: ProfileInput) {
  await setDoc(
    profileRef(tenantId),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* ------------------------------------------------------------------ */
/* Print template (thermal receipt / invoice)                          */
/* ------------------------------------------------------------------ */

export type PaperWidth = "58mm" | "80mm";

export interface PrintTemplate {
  // header
  showLogo: boolean;
  headerText: string;
  showRnc: boolean;
  showPhone: boolean;
  showAddress: boolean;
  // body
  showItbisBreakdown: boolean;
  showPatient: boolean;
  showCashier: boolean;
  // footer
  footerText: string;
  showFiscalMessage: boolean;
  // paper
  paperWidth: PaperWidth;
  updatedAt?: number;
}

export type PrintTemplateInput = Omit<PrintTemplate, "updatedAt">;

export const DEFAULT_PRINT_TEMPLATE: PrintTemplateInput = {
  showLogo: true,
  headerText: "",
  showRnc: true,
  showPhone: true,
  showAddress: true,
  showItbisBreakdown: true,
  showPatient: true,
  showCashier: true,
  footerText: "¡Gracias por su visita!",
  showFiscalMessage: true,
  paperWidth: "80mm",
};

export function printTemplateRef(tenantId: string) {
  return doc(db, "tenants", tenantId, "settings", "printTemplate");
}

export function subscribePrintTemplate(
  tenantId: string,
  cb: (tpl: PrintTemplate | null) => void,
) {
  return onSnapshot(printTemplateRef(tenantId), (snap) => {
    cb(snap.exists() ? (snap.data() as PrintTemplate) : null);
  });
}

export async function savePrintTemplate(
  tenantId: string,
  input: PrintTemplateInput,
) {
  await setDoc(
    printTemplateRef(tenantId),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/* ------------------------------------------------------------------ */
/* System settings                                                     */
/* ------------------------------------------------------------------ */

export interface SystemSettings {
  currency: string; // ISO code, default "DOP"
  itbisRate: number; // percent, e.g. 18
  invoicePrefix: string; // numbering prefix, e.g. "FAC-"
  timezone: string; // IANA tz, e.g. "America/Santo_Domingo"
  requireCashSession: boolean; // exigir apertura de caja antes de cobrar
  updatedAt?: number;
}

export type SystemSettingsInput = Omit<SystemSettings, "updatedAt">;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsInput = {
  currency: "DOP",
  itbisRate: 18,
  invoicePrefix: "FAC-",
  timezone: "America/Santo_Domingo",
  requireCashSession: false,
};

export function systemSettingsRef(tenantId: string) {
  return doc(db, "tenants", tenantId, "settings", "system");
}

export function subscribeSystemSettings(
  tenantId: string,
  cb: (s: SystemSettings | null) => void,
) {
  return onSnapshot(systemSettingsRef(tenantId), (snap) => {
    cb(snap.exists() ? (snap.data() as SystemSettings) : null);
  });
}

export async function saveSystemSettings(
  tenantId: string,
  input: SystemSettingsInput,
) {
  await setDoc(
    systemSettingsRef(tenantId),
    { ...input, updatedAt: serverTimestamp() },
    { merge: true },
  );
}
