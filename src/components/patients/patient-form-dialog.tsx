"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPatient, updatePatient, type PatientInput } from "@/lib/data/patients";
import type { Patient } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PatientFormFields,
  type DocumentType,
} from "@/components/patients/patient-form-fields";

const EMPTY: PatientInput = {
  firstName: "",
  lastName: "",
  cedula: "",
  passport: "",
  nss: "",
  dob: "",
  sexAtBirth: undefined,
  bloodType: "",
  nationality: "Dominicana",
  patientCategory: "ambulatory",
  phoneMobile: "",
  phoneHome: "",
  email: "",
  addressStreet: "",
  addressSector: "",
  addressMunicipality: "",
  addressProvince: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  emergencyContactRelationship: "",
  legalGuardian: "",
  affiliateNumber: "",
  contractNumber: "",
  familyHistory: "",
  medicalHistory: "",
};

function fromPatient(patient: Patient | null): PatientInput {
  if (!patient) return EMPTY;
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    cedula: patient.cedula ?? "",
    passport: patient.passport ?? "",
    nss: patient.nss ?? "",
    dob: patient.dob ?? "",
    sexAtBirth: patient.sexAtBirth,
    bloodType: patient.bloodType ?? "",
    nationality: patient.nationality ?? "Dominicana",
    patientCategory: patient.patientCategory ?? "ambulatory",
    phoneMobile: patient.phoneMobile ?? "",
    phoneHome: patient.phoneHome ?? "",
    email: patient.email ?? "",
    addressStreet: patient.addressStreet ?? "",
    addressSector: patient.addressSector ?? "",
    addressMunicipality: patient.addressMunicipality ?? "",
    addressProvince: patient.addressProvince ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: patient.emergencyContactPhone ?? "",
    emergencyContactRelationship: patient.emergencyContactRelationship ?? "",
    legalGuardian: patient.legalGuardian ?? "",
    affiliateNumber: patient.affiliateNumber ?? "",
    contractNumber: patient.contractNumber ?? "",
    familyHistory: patient.familyHistory ?? "",
    medicalHistory: patient.medicalHistory ?? "",
  };
}

function cleanInput(input: PatientInput): PatientInput {
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

export function PatientFormDialog({
  open,
  onOpenChange,
  tenantId,
  patient,
  title,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  patient?: Patient | null;
  title?: string;
  onSaved?: (patient: Patient) => void;
}) {
  const isEdit = !!patient;
  const [form, setForm] = useState<PatientInput>(() => fromPatient(patient ?? null));
  const [documentType, setDocumentType] = useState<DocumentType>(
    patient?.passport ? "passport" : "cedula",
  );
  const [isMinor, setIsMinor] = useState(!!patient?.legalGuardian);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof PatientInput>(key: K, value: PatientInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    const payload = cleanInput({
      ...form,
      legalGuardian: isMinor ? form.legalGuardian : "",
    });
    if (!payload.firstName || !payload.lastName) {
      toast.error("Nombre y apellido son obligatorios");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && patient) {
        await updatePatient(tenantId, patient.id, payload);
        toast.success("Paciente actualizado");
        onSaved?.({ ...patient, ...payload });
      } else {
        const ref = await createPatient(tenantId, payload);
        toast.success("Paciente registrado");
        onSaved?.({ id: ref.id, active: true, ...payload } as Patient);
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar el paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-2rem)] max-w-4xl grid-rows-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/20 px-6 py-4">
          <DialogTitle>{title ?? (isEdit ? "Editar paciente" : "Nuevo paciente")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <PatientFormFields
              form={form}
              set={set}
              documentType={documentType}
              setDocumentType={setDocumentType}
              isMinor={isMinor}
              setIsMinor={setIsMinor}
            />
          </div>

          <DialogFooter className="shrink-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Guardar" : "Guardar paciente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
