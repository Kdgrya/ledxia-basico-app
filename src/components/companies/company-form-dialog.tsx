"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import {
  createCompany,
  updateCompany,
  type Company,
  type CompanyInput,
} from "@/lib/data/companies";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY: CompanyInput = {
  name: "",
  rnc: "",
  phone: "",
  email: "",
  address: "",
};

export function CompanyFormDialog({
  open,
  onOpenChange,
  tenantId,
  company,
  defaultName,
  title,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  company?: Company | null;
  defaultName?: string;
  title?: string;
  onSaved?: (company: Company) => void;
}) {
  const isEdit = !!company;
  const [form, setForm] = useState<CompanyInput>(() =>
    company
      ? {
          name: company.name,
          rnc: company.rnc ?? "",
          phone: company.phone ?? "",
          email: company.email ?? "",
          address: company.address ?? "",
        }
      : { ...EMPTY, name: defaultName ?? "" },
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof CompanyInput>(key: K, value: CompanyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    if (!form.name.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && company) {
        await updateCompany(tenantId, company.id, form);
        toast.success("Empresa actualizada");
        onSaved?.({ ...company, ...form });
      } else {
        const ref = await createCompany(tenantId, form);
        toast.success("Empresa registrada");
        onSaved?.({
          id: ref.id,
          active: true,
          name: form.name.trim(),
          rnc: form.rnc?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          email: form.email?.trim() || undefined,
          address: form.address?.trim() || undefined,
        });
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar la empresa");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b bg-muted/20 px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            {title ?? (isEdit ? "Editar empresa" : "Registrar empresa")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 px-6 py-5">
          <FieldGroup label="Nombre / Razón social *">
            <Input
              required
              autoFocus
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nombre de la empresa"
            />
          </FieldGroup>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldGroup label="RNC">
              <Input
                value={form.rnc ?? ""}
                onChange={(e) => set("rnc", e.target.value)}
                placeholder="000000000"
                className="font-mono tracking-wide"
              />
            </FieldGroup>
            <FieldGroup label="Teléfono">
              <Input
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                type="tel"
                placeholder="809-000-0000"
              />
            </FieldGroup>
          </div>
          <FieldGroup label="Email">
            <Input
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              type="email"
              placeholder="facturacion@empresa.com"
            />
          </FieldGroup>
          <FieldGroup label="Dirección">
            <Input
              value={form.address ?? ""}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Dirección fiscal"
            />
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Guardar" : "Guardar empresa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
