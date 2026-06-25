import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

// Empresas a las que se les factura órdenes. Viven en /tenants/{tid}/companies.
export interface Company {
  id: string;
  name: string;
  rnc?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type CompanyInput = Pick<Company, "name"> &
  Partial<Pick<Company, "rnc" | "phone" | "email" | "address">>;

export function companiesCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "companies");
}

function cleanInput(input: CompanyInput): CompanyInput {
  const out: CompanyInput = { name: input.name.trim() };
  for (const [key, value] of Object.entries(input) as [keyof CompanyInput, unknown][]) {
    if (key === "name") continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) (out as Record<string, unknown>)[key] = trimmed;
    } else if (value !== undefined && value !== null) {
      (out as Record<string, unknown>)[key] = value;
    }
  }
  return out;
}

export async function createCompany(tenantId: string, input: CompanyInput) {
  return addDoc(companiesCol(tenantId), {
    ...cleanInput(input),
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCompany(
  tenantId: string,
  id: string,
  input: Partial<CompanyInput & { active: boolean }>,
) {
  return updateDoc(doc(db, "tenants", tenantId, "companies", id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

// Búsqueda en memoria sobre la lista de empresas (nombre o RNC).
export function matchesCompany(c: Company, term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return (
    c.name.toLowerCase().includes(t) || (c.rnc ?? "").toLowerCase().includes(t)
  );
}
