import type { ModuleKey } from "@/lib/modules";

// Tipos de dominio, adaptados a documentos de Firestore.

export type ID = string;

export interface ClinicUser {
  id: ID;
  email: string;
  displayName: string;
  role: string; // role name (builtin or custom)
  permissions?: ModuleKey[]; // anula los módulos del rol
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Role {
  id: ID;
  name: string;
  label: string;
  permissions: ModuleKey[];
  isBuiltin: boolean;
}

export type Sex = "M" | "F" | "O";

export interface Patient {
  id: ID;
  firstName: string;
  lastName: string;
  cedula: string;
  passport?: string;
  nss?: string;
  dob?: string; // ISO date
  sexAtBirth?: Sex;
  bloodType?: string;
  nationality?: string;
  patientCategory?: "ambulatory" | "hospitalized" | "emergency";
  phoneMobile?: string;
  phoneHome?: string;
  email?: string;
  addressStreet?: string;
  addressSector?: string;
  addressMunicipality?: string;
  addressProvince?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  legalGuardian?: string;
  affiliateNumber?: string;
  contractNumber?: string;
  familyHistory?: string;
  medicalHistory?: string;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface Service {
  id: ID;
  name: string;
  code?: string;
  price: number;
  taxRate: number; // 0, 16, 18 (ITBIS)
  active: boolean;
}

export type InvoiceStatus = "pending" | "partial" | "paid" | "cancelled";
export type FiscalRegime = "fiscal" | "generic";
export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "transfer" | "check";

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  total: number;
}

export interface Payment {
  id: ID;
  invoiceId: ID;
  amount: number;
  method: PaymentMethod;
  amountTendered?: number;
  changeGiven?: number;
  currency: string; // "DOP"
  reference?: string;
  receivedBy: ID;
  paidAt: number;
}

export interface EcfStatus {
  ncf?: string; // eNCF (E31…)
  trackId?: string;
  status?: "pending" | "sent" | "accepted" | "rejected" | "conditional" | "error";
  message?: string;
}

export interface Invoice {
  id: ID;
  invoiceNumber: string;
  patientId: ID;
  patientName?: string;
  // Presente cuando se factura a una empresa.
  companyId?: ID;
  companyName?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  fiscalRegime: FiscalRegime;
  ncfType?: string; // B01/B02…
  ecf?: EcfStatus;
  notes?: string;
  issuedAt: number;
  issuedBy: ID;
  cancelledAt?: number;
  cancelledBy?: ID;
  cancellationReason?: string;
  createdAt?: number;
  updatedAt?: number;
}
