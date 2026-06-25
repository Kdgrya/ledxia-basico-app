"use client";

import {
  Baby,
  CheckCircle2,
  HeartPulse,
  Phone,
  ShieldPlus,
  User,
} from "lucide-react";
import type { PatientInput } from "@/lib/data/patients";
import type { Sex } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export type DocumentType = "cedula" | "passport" | "rnc";

// Campos controlados del formulario de paciente, compartidos por el diálogo y el sheet de orden.
export function PatientFormFields({
  form,
  set,
  documentType,
  setDocumentType,
  isMinor,
  setIsMinor,
  showHistory = true,
}: {
  form: PatientInput;
  set: <K extends keyof PatientInput>(key: K, value: PatientInput[K]) => void;
  documentType: DocumentType;
  setDocumentType: (v: DocumentType) => void;
  isMinor: boolean;
  setIsMinor: (v: boolean) => void;
  showHistory?: boolean;
}) {
  function documentValue() {
    if (documentType === "passport") return form.passport ?? "";
    if (documentType === "rnc") return form.nss ?? "";
    return form.cedula ?? "";
  }

  function setDocumentValue(value: string) {
    if (documentType === "passport") {
      set("passport", value);
      return;
    }
    if (documentType === "rnc") {
      set("nss", value);
      return;
    }
    set("cedula", value);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <SectionTitle icon={CheckCircle2}>Documento de identidad</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <FieldGroup label="Documento">
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="flex h-9 w-32 rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="cedula">Cédula</option>
              <option value="passport">Pasaporte</option>
              <option value="rnc">RNC/NSS</option>
            </select>
          </FieldGroup>
          <FieldGroup label="Número">
            <div className="relative">
              <Input
                value={documentValue()}
                onChange={(e) => setDocumentValue(e.target.value)}
                placeholder={documentType === "cedula" ? "00100000000" : "Número"}
                className="h-9 w-44 pr-9 font-mono tracking-wide"
              />
              {documentType === "cedula" &&
                documentValue().replace(/\D/g, "").length === 11 && (
                  <CheckCircle2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-500" />
                )}
            </div>
          </FieldGroup>
          <label className="flex min-h-9 cursor-pointer select-none items-center gap-2 pb-0.5 text-[13px] font-medium">
            <Checkbox checked={isMinor} onCheckedChange={(v) => setIsMinor(v === true)} />
            <Baby className="h-3.5 w-3.5 text-muted-foreground" />
            Menor de edad
          </label>
        </div>
        {isMinor && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FieldGroup label="Nombre del responsable">
              <Input
                value={form.legalGuardian ?? ""}
                onChange={(e) => set("legalGuardian", e.target.value)}
                placeholder="Tutor legal"
              />
            </FieldGroup>
            <FieldGroup label="Teléfono del responsable">
              <Input
                value={form.emergencyContactPhone ?? ""}
                onChange={(e) => set("emergencyContactPhone", e.target.value)}
                placeholder="809-000-0000"
              />
            </FieldGroup>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <SectionTitle icon={User}>Datos personales</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="Nombre *">
            <Input
              required
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
              placeholder="Nombre del paciente"
            />
          </FieldGroup>
          <FieldGroup label="Apellido *">
            <Input
              required
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
              placeholder="Apellido del paciente"
            />
          </FieldGroup>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <FieldGroup label="Fecha de nacimiento">
            <Input
              type="date"
              value={form.dob ?? ""}
              onChange={(e) => set("dob", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Sexo">
            <NativeSelect
              value={form.sexAtBirth ?? ""}
              onChange={(value) => set("sexAtBirth", (value || undefined) as Sex | undefined)}
            >
              <option value="">Seleccionar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </NativeSelect>
          </FieldGroup>
          <FieldGroup label="Tipo de sangre">
            <NativeSelect
              value={form.bloodType ?? ""}
              onChange={(value) => set("bloodType", value)}
            >
              <option value="">—</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </FieldGroup>
          <FieldGroup label="Nacionalidad">
            <Input
              value={form.nationality ?? ""}
              onChange={(e) => set("nationality", e.target.value)}
            />
          </FieldGroup>
        </div>

        <div>
          <Label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Tipo de atención
          </Label>
          <div className="flex gap-2">
            {(
              [
                ["ambulatory", "Ambulatorio"],
                ["hospitalized", "Hospitalizado"],
                ["emergency", "Emergencia"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => set("patientCategory", value)}
                className={cn(
                  "h-8 flex-1 rounded-lg border px-2 text-[13px] font-medium transition-colors",
                  form.patientCategory === value
                    ? "border-[color:var(--brand-primary,#00A99D)] bg-[color:var(--brand-primary,#00A99D)] text-white"
                    : "border-input bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={Phone}>Contacto</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldGroup label="Celular">
            <Input
              value={form.phoneMobile ?? ""}
              onChange={(e) => set("phoneMobile", e.target.value)}
              type="tel"
              placeholder="809-000-0000"
            />
          </FieldGroup>
          <FieldGroup label="Teléfono casa">
            <Input
              value={form.phoneHome ?? ""}
              onChange={(e) => set("phoneHome", e.target.value)}
              type="tel"
              placeholder="809-000-0000"
            />
          </FieldGroup>
          <FieldGroup label="Email">
            <Input
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              type="email"
              placeholder="correo@ejemplo.com"
            />
          </FieldGroup>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Dirección</SectionTitle>
        <FieldGroup label="Dirección">
          <Input
            value={form.addressStreet ?? ""}
            onChange={(e) => set("addressStreet", e.target.value)}
            placeholder="Calle y número"
          />
        </FieldGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldGroup label="Sector">
            <Input
              value={form.addressSector ?? ""}
              onChange={(e) => set("addressSector", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Municipio">
            <Input
              value={form.addressMunicipality ?? ""}
              onChange={(e) => set("addressMunicipality", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Provincia">
            <Input
              value={form.addressProvince ?? ""}
              onChange={(e) => set("addressProvince", e.target.value)}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>Contacto de emergencia</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <FieldGroup label="Nombre">
            <Input
              value={form.emergencyContactName ?? ""}
              onChange={(e) => set("emergencyContactName", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Teléfono">
            <Input
              value={form.emergencyContactPhone ?? ""}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
            />
          </FieldGroup>
          <FieldGroup label="Parentesco">
            <Input
              value={form.emergencyContactRelationship ?? ""}
              onChange={(e) => set("emergencyContactRelationship", e.target.value)}
            />
          </FieldGroup>
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle icon={ShieldPlus}>Seguro médico</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldGroup label="No. afiliado / carnet">
            <Input
              value={form.affiliateNumber ?? ""}
              onChange={(e) => set("affiliateNumber", e.target.value)}
              placeholder="Número de afiliado ARS"
            />
          </FieldGroup>
          <FieldGroup label="No. póliza / contrato">
            <Input
              value={form.contractNumber ?? ""}
              onChange={(e) => set("contractNumber", e.target.value)}
              placeholder="Número de póliza"
            />
          </FieldGroup>
        </div>
        <FieldGroup label="NSS (Número Seguridad Social)">
          <Input
            value={form.nss ?? ""}
            onChange={(e) => set("nss", e.target.value)}
            placeholder="Número de seguridad social"
            className="max-w-xs"
          />
        </FieldGroup>
      </section>

      {showHistory && (
        <section className="space-y-3">
          <SectionTitle icon={HeartPulse}>Antecedentes</SectionTitle>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldGroup label="Antecedentes familiares">
              <Textarea
                value={form.familyHistory ?? ""}
                onChange={(e) => set("familyHistory", e.target.value)}
                placeholder="Diabetes, hipertensión, cáncer, cardiopatías, etc."
                rows={4}
                className="min-h-24 resize-y"
              />
            </FieldGroup>
            <FieldGroup label="Antecedentes médicos personales">
              <Textarea
                value={form.medicalHistory ?? ""}
                onChange={(e) => set("medicalHistory", e.target.value)}
                placeholder="Cirugías, hospitalizaciones, alergias, medicación habitual, etc."
                rows={4}
                className="min-h-24 resize-y"
              />
            </FieldGroup>
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  children,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-1.5">
      {Icon && <Icon className="h-3.5 w-3.5 text-[color:var(--brand-primary,#00A99D)]" />}
      <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {children}
      </h4>
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-9 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-sm outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
      )}
    >
      {children}
    </select>
  );
}
