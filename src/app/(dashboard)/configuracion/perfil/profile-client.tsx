"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { subscribeProfile, saveProfile, type ProfileInput } from "@/lib/data/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY: ProfileInput = {
  name: "",
  subtitle: "",
  logoUrl: "",
  primaryColor: "#2563eb",
  phone: "",
  address: "",
  rnc: "",
};

const COLOR_PRESETS = [
  { label: "Azul", value: "#2563eb" },
  { label: "Índigo", value: "#4f46e5" },
  { label: "Violeta", value: "#7c3aed" },
  { label: "Verde", value: "#16a34a" },
  { label: "Esmeralda", value: "#059669" },
  { label: "Cian", value: "#0891b2" },
  { label: "Naranja", value: "#ea580c" },
  { label: "Rojo", value: "#dc2626" },
];

export function ProfileClient() {
  const { tenantId } = useAuth();
  const [form, setForm] = useState<ProfileInput>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    return subscribeProfile(tenantId, (profile) => {
      if (profile) {
        setForm({
          name: profile.name ?? "",
          subtitle: profile.subtitle ?? "",
          logoUrl: profile.logoUrl ?? "",
          primaryColor: profile.primaryColor ?? "#2563eb",
          phone: profile.phone ?? "",
          address: profile.address ?? "",
          rnc: profile.rnc ?? "",
        });
      }
      setLoading(false);
    });
  }, [tenantId]);

  function set<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      await saveProfile(tenantId, form);
      toast.success("Perfil guardado");
    } catch {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Perfil de la clínica</h2>
        <p className="text-sm text-muted-foreground">
          Datos que aparecen en recibos, facturas y la UI del sistema.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {/* identidad */}
        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Identidad</h3>
          <div className="space-y-2">
            <Label htmlFor="p-name">Nombre de la clínica *</Label>
            <Input
              id="p-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Clínica Ejemplo"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-subtitle">Subtítulo / eslogan</Label>
            <Input
              id="p-subtitle"
              value={form.subtitle}
              onChange={(e) => set("subtitle", e.target.value)}
              placeholder="Cuidando tu salud desde 2010"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-rnc">RNC</Label>
            <Input
              id="p-rnc"
              value={form.rnc}
              onChange={(e) => set("rnc", e.target.value)}
              placeholder="1-01-00000-0"
            />
          </div>
        </section>

        {/* contacto */}
        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Contacto y ubicación</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-phone">Teléfono</Label>
              <Input
                id="p-phone"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="809-555-0000"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-address">Dirección</Label>
            <Input
              id="p-address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Calle Principal #1, Ciudad"
            />
          </div>
        </section>

        {/* branding */}
        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Apariencia</h3>
          <div className="space-y-2">
            <Label htmlFor="p-logo">URL del logotipo</Label>
            <Input
              id="p-logo"
              type="url"
              value={form.logoUrl}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://ejemplo.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              URL pública de la imagen. Aparece en el sidebar y los recibos térmicos.
            </p>
          </div>
          {form.logoUrl && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logoUrl}
                alt="Logo"
                className="h-12 w-12 rounded object-contain border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <p className="text-xs text-muted-foreground">Vista previa del logo</p>
            </div>
          )}
          <div className="space-y-2">
            <Label>Color principal</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => set("primaryColor", c.value)}
                  className="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor:
                      form.primaryColor === c.value ? "white" : "transparent",
                    outline:
                      form.primaryColor === c.value
                        ? `2px solid ${c.value}`
                        : "none",
                  }}
                />
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => set("primaryColor", e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border"
                  title="Color personalizado"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {form.primaryColor}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* preview sidebar */}
        <section className="rounded-lg border p-4 space-y-3">
          <h3 className="font-semibold text-sm">Vista previa del sidebar</h3>
          <div
            className="w-48 rounded-lg border p-3 text-sm"
            style={{ borderColor: form.primaryColor + "33" }}
          >
            <div className="flex items-center gap-2 mb-3">
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logoUrl}
                  alt=""
                  className="h-6 w-6 rounded object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: form.primaryColor }}
                />
              )}
              <div>
                <p className="font-bold text-xs leading-tight truncate max-w-[100px]">
                  {form.name || "Mi Clínica"}
                </p>
                {form.subtitle && (
                  <p className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                    {form.subtitle}
                  </p>
                )}
              </div>
            </div>
            {["Inicio", "Pacientes", "Recepción"].map((item) => (
              <div
                key={item}
                className="rounded px-2 py-1 text-xs text-muted-foreground mb-1"
              >
                {item}
              </div>
            ))}
            <div
              className="rounded px-2 py-1 text-xs font-medium"
              style={{ backgroundColor: form.primaryColor + "20", color: form.primaryColor }}
            >
              Facturación
            </div>
          </div>
        </section>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar perfil
        </Button>
      </form>
    </div>
  );
}
