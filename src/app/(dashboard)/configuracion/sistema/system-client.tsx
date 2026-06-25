"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  subscribeSystemSettings,
  saveSystemSettings,
  DEFAULT_SYSTEM_SETTINGS,
  type SystemSettingsInput,
} from "@/lib/data/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CURRENCIES = [
  { value: "DOP", label: "Peso dominicano (DOP)" },
  { value: "USD", label: "Dólar estadounidense (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
];

const TIMEZONES = [
  { value: "America/Santo_Domingo", label: "Santo Domingo (GMT-4)" },
  { value: "America/New_York", label: "Nueva York (GMT-5/-4)" },
  { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
  { value: "America/Bogota", label: "Bogotá (GMT-5)" },
];

export function SystemClient() {
  const { tenantId } = useAuth();
  const [form, setForm] = useState<SystemSettingsInput>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    return subscribeSystemSettings(tenantId, (s) => {
      if (s) {
        setForm({
          currency: s.currency ?? DEFAULT_SYSTEM_SETTINGS.currency,
          itbisRate: s.itbisRate ?? DEFAULT_SYSTEM_SETTINGS.itbisRate,
          invoicePrefix: s.invoicePrefix ?? DEFAULT_SYSTEM_SETTINGS.invoicePrefix,
          timezone: s.timezone ?? DEFAULT_SYSTEM_SETTINGS.timezone,
          requireCashSession:
            s.requireCashSession ?? DEFAULT_SYSTEM_SETTINGS.requireCashSession,
        });
      }
      setLoading(false);
    });
  }, [tenantId]);

  function set<K extends keyof SystemSettingsInput>(
    key: K,
    value: SystemSettingsInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      await saveSystemSettings(tenantId, form);
      toast.success("Configuración del sistema guardada");
    } catch {
      toast.error("No se pudo guardar la configuración");
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
        <h1 className="text-2xl font-bold tracking-tight">Sistema</h1>
        <p className="text-sm text-muted-foreground">
          Opciones generales de facturación y comportamiento del sistema.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Facturación</h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => set("currency", v as string)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="s-itbis">ITBIS por defecto (%)</Label>
              <Input
                id="s-itbis"
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={form.itbisRate}
                onChange={(e) => set("itbisRate", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="s-prefix">Prefijo de numeración de facturas</Label>
            <Input
              id="s-prefix"
              value={form.invoicePrefix}
              onChange={(e) => set("invoicePrefix", e.target.value)}
              placeholder="FAC-"
            />
            <p className="text-xs text-muted-foreground">
              Se antepone al número correlativo, ej. {form.invoicePrefix || "FAC-"}000123.
            </p>
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Regional</h3>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => set("timezone", v as string)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="rounded-lg border p-4 space-y-4">
          <h3 className="font-semibold">Caja</h3>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox
              checked={form.requireCashSession}
              onCheckedChange={(c) => set("requireCashSession", c === true)}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">
                Exigir apertura de caja antes de cobrar
              </span>
              <span className="block text-xs text-muted-foreground">
                Bloquea el registro de pagos si no hay una sesión de caja abierta.
              </span>
            </span>
          </label>
        </section>

        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar configuración
        </Button>
      </form>
    </div>
  );
}
