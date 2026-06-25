import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Patient } from "@/lib/types";

export type PatientInput = Pick<Patient, "firstName" | "lastName"> &
  Partial<
    Pick<
      Patient,
      | "cedula"
      | "passport"
      | "nss"
      | "dob"
      | "sexAtBirth"
      | "bloodType"
      | "nationality"
      | "patientCategory"
      | "phoneMobile"
      | "phoneHome"
      | "email"
      | "addressStreet"
      | "addressSector"
      | "addressMunicipality"
      | "addressProvince"
      | "emergencyContactName"
      | "emergencyContactPhone"
      | "emergencyContactRelationship"
      | "legalGuardian"
      | "affiliateNumber"
      | "contractNumber"
      | "familyHistory"
      | "medicalHistory"
    >
  >;

export function patientsCol(tenantId: string) {
  return collection(db, "tenants", tenantId, "patients");
}

export function patientFullName(p: Pick<Patient, "firstName" | "lastName">) {
  return `${p.firstName} ${p.lastName}`.trim();
}

// Normaliza el formulario de paciente antes de guardarlo: recorta strings,
// quita campos vacíos (Firestore rechaza `undefined`) y limpia cédula / NSS.
export function cleanPatientInput(input: PatientInput): PatientInput {
  const out: PatientInput = {
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
  };

  for (const [key, value] of Object.entries(input) as [keyof PatientInput, unknown][]) {
    if (key === "firstName" || key === "lastName") continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        (out as Record<string, unknown>)[key] =
          key === "cedula" || key === "nss" ? trimmed.replace(/\D/g, "") : trimmed;
      }
      continue;
    }
    if (value !== undefined && value !== null) {
      (out as Record<string, unknown>)[key] = value;
    }
  }

  return out;
}

export async function createPatient(tenantId: string, input: PatientInput) {
  return addDoc(patientsCol(tenantId), {
    ...cleanPatientInput(input),
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updatePatient(
  tenantId: string,
  id: string,
  input: Partial<PatientInput>,
) {
  return updateDoc(doc(db, "tenants", tenantId, "patients", id), {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

// Años a partir de una fecha de nacimiento ISO, o null.
export function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
