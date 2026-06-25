import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface EcfConfig {
  rnc: string;
  businessName: string;
  environment: string; // "CerteCF" | "eCF"
  isActive: boolean;
  hasCert: boolean; // el certificado nunca se expone al cliente
  certExpiresAt?: string;
}

export interface EcfSubmission {
  id: string;
  invoiceId: string;
  encf?: string;
  trackId?: string;
  status: string; // pending | sent | accepted | rejected | error
  attempts: number;
  lastError?: string;
  sentAt?: number;
  resolvedAt?: number;
}

export interface FiscalSequence {
  ncfType: string;
  prefix: string;
  current: number;
  max: number;
}

// Suscripción a la configuración e-CF del tenant.
export function subscribeEcfConfig(
  tenantId: string,
  cb: (config: EcfConfig | null) => void,
): () => void {
  const ref = doc(db, "tenants", tenantId, "ecfConfig", "config");
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      cb(null);
      return;
    }
    const data = snap.data() as Record<string, unknown>;
    cb({
      rnc: (data.rnc as string) ?? "",
      businessName: (data.businessName as string) ?? "",
      environment: (data.environment as string) ?? "CerteCF",
      isActive: (data.isActive as boolean) ?? false,
      hasCert: !!(data.certBase64 as string | undefined),
      certExpiresAt: (data.certExpiresAt as string | undefined) ?? undefined,
    });
  });
}

// Suscripción a los envíos e-CF del tenant.
export function subscribeSubmissions(
  tenantId: string,
  cb: (submissions: EcfSubmission[]) => void,
): () => void {
  const q = query(
    collection(db, "tenants", tenantId, "ecfSubmissions"),
    orderBy("createdAt", "desc"),
  );
  return onSnapshot(q, (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          invoiceId: (data.invoiceId as string) ?? "",
          encf: (data.encf as string | undefined) ?? undefined,
          trackId: (data.trackId as string | undefined) ?? undefined,
          status: (data.status as string) ?? "pending",
          attempts: (data.attempts as number) ?? 0,
          lastError: (data.lastError as string | undefined) ?? undefined,
          sentAt: (data.sentAt as number | undefined) ?? undefined,
          resolvedAt: (data.resolvedAt as number | undefined) ?? undefined,
        };
      }),
    );
  });
}

// Suscripción a las secuencias fiscales del tenant.
export function subscribeSequences(
  tenantId: string,
  cb: (sequences: FiscalSequence[]) => void,
): () => void {
  return onSnapshot(collection(db, "tenants", tenantId, "fiscalSequences"), (snap) => {
    cb(
      snap.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          ncfType: (data.ncfType as string) ?? d.id,
          prefix: (data.prefix as string) ?? "",
          current: (data.current as number) ?? 0,
          max: (data.max as number) ?? 0,
        };
      }),
    );
  });
}

export const ECF_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  error: "Error",
};

export const ECF_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "secondary",
  sent: "outline",
  accepted: "default",
  rejected: "destructive",
  error: "destructive",
};
