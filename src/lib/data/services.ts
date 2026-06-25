import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Service } from "@/lib/types";

export type ServiceInput = Pick<Service, "name" | "code" | "price" | "taxRate">;

export function servicesCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "services");
}

export async function createService(tenantId: string, input: ServiceInput) {
  return addDoc(servicesCol(tenantId), {
    ...input,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateService(
  tenantId: string,
  id: string,
  input: Partial<ServiceInput & { active: boolean }>,
) {
  return updateDoc(doc(db, "tenants", tenantId, "services", id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export function formatPrice(amount: number) {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  }).format(amount);
}
