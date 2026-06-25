"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Clock, Send } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  subscribeEcfConfig,
  subscribeSubmissions,
  subscribeSequences,
  ECF_STATUS_LABEL,
  ECF_STATUS_VARIANT,
  type EcfConfig,
  type EcfSubmission,
  type FiscalSequence,
} from "@/lib/data/ecf";
import {
  saveEcfConfigFn,
  uploadCertificateFn,
  activateEcfFn,
} from "@/lib/firebase/functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Tab = "datos" | "certificado" | "activacion" | "secuencias" | "envios";

const TABS: { key: Tab; label: string }[] = [
  { key: "datos", label: "Datos fiscales" },
  { key: "certificado", label: "Certificado P12" },
  { key: "activacion", label: "Activación" },
  { key: "secuencias", label: "Secuencias NCF" },
  { key: "envios", label: "Envíos" },
];

export function EcfClient() {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("datos");
  const [config, setConfig] = useState<EcfConfig | null>(null);
  const [submissions, setSubmissions] = useState<EcfSubmission[]>([]);
  const [sequences, setSequences] = useState<FiscalSequence[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const u1 = subscribeEcfConfig(tenantId, (c) => {
      setConfig(c);
      setLoadingConfig(false);
    });
    const u2 = subscribeSubmissions(tenantId, setSubmissions);
    const u3 = subscribeSequences(tenantId, setSequences);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [tenantId]);

  if (loadingConfig) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              activeTab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "datos" && (
        <DatosFiscalesTab
          key={`${config?.rnc ?? ""}:${config?.businessName ?? ""}:${config?.environment ?? ""}`}
          config={config}
          tenantId={tenantId}
        />
      )}
      {activeTab === "certificado" && (
        <CertificadoTab config={config} tenantId={tenantId} />
      )}
      {activeTab === "activacion" && (
        <ActivacionTab config={config} tenantId={tenantId} />
      )}
      {activeTab === "secuencias" && (
        <SecuenciasTab sequences={sequences} />
      )}
      {activeTab === "envios" && (
        <EnviosTab submissions={submissions} />
      )}
    </div>
  );
}

function DatosFiscalesTab({
  config,
  tenantId,
}: {
  config: EcfConfig | null;
  tenantId?: string;
}) {
  const [rnc, setRnc] = useState(config?.rnc ?? "");
  const [businessName, setBusinessName] = useState(config?.businessName ?? "");
  const [environment, setEnvironment] = useState(config?.environment ?? "CerteCF");
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      await saveEcfConfigFn({ rnc: rnc.trim(), businessName: businessName.trim(), environment });
      toast.success("Configuración guardada");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`No se pudo guardar: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      <div className="space-y-2">
        <Label htmlFor="ecf-rnc">RNC</Label>
        <Input
          id="ecf-rnc"
          required
          value={rnc}
          onChange={(e) => setRnc(e.target.value)}
          placeholder="101234567"
          maxLength={11}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ecf-biz">Razón social</Label>
        <Input
          id="ecf-biz"
          required
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Clínica Ejemplo, SRL"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ecf-env">Ambiente</Label>
        <select
          id="ecf-env"
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="CerteCF">Prueba (CerteCF)</option>
          <option value="eCF">Producción (eCF)</option>
        </select>
      </div>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </form>
  );
}

function CertificadoTab({
  config,
  tenantId,
}: {
  config: EcfConfig | null;
  tenantId?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [certBase64, setCertBase64] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [saving, setSaving] = useState(false);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Quita el prefijo data URL para dejar solo base64.
      const base64 = result.split(",")[1] ?? result;
      setCertBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId || !certBase64 || !passphrase) return;
    setSaving(true);
    try {
      const res = await uploadCertificateFn({ certBase64, passphrase });
      const expiresAt = res.data.certExpiresAt
        ? new Date(res.data.certExpiresAt).toLocaleDateString("es-DO")
        : null;
      toast.success(
        expiresAt ? `Certificado guardado. Vence: ${expiresAt}` : "Certificado guardado.",
      );
      setCertBase64(null);
      setPassphrase("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al subir certificado: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-md">
      {config?.hasCert && (
        <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm">
          <span className="font-medium">Certificado cargado.</span>
          {config.certExpiresAt && (
            <span className="ml-2 text-muted-foreground">
              Vence: {new Date(config.certExpiresAt).toLocaleDateString("es-DO")}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="ecf-p12">Archivo .p12</Label>
        <input
          id="ecf-p12"
          ref={fileRef}
          type="file"
          accept=".p12,.pfx"
          required={!certBase64}
          onChange={onFileChange}
          className="flex h-9 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ecf-pass">Contraseña del certificado</Label>
        <Input
          id="ecf-pass"
          type="password"
          required
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Contraseña del .p12"
          autoComplete="off"
        />
      </div>

      <Button type="submit" disabled={saving || !certBase64 || !passphrase}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Subir certificado
      </Button>
    </form>
  );
}

function ActivacionTab({
  config,
  tenantId,
}: {
  config: EcfConfig | null;
  tenantId?: string;
}) {
  const [saving, setSaving] = useState(false);
  const ready = !!(config?.hasCert && config?.rnc);

  async function toggle() {
    if (!tenantId || !config) return;
    setSaving(true);
    try {
      await activateEcfFn({ isActive: !config.isActive });
      toast.success(
        config.isActive ? "e-CF desactivado." : "e-CF activado correctamente.",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`No se pudo cambiar el estado: ${msg}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="rounded-md border bg-background p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Estado actual</p>
            <p className="text-sm text-muted-foreground">
              {config?.isActive
                ? "e-CF activo — las facturas fiscales se transmiten a la DGII."
                : "e-CF inactivo."}
            </p>
          </div>
          <Badge variant={config?.isActive ? "default" : "secondary"}>
            {config?.isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>

        {!ready && (
          <p className="text-sm text-destructive">
            {!config?.rnc
              ? "Configura el RNC y la razón social primero."
              : "Sube el certificado P12 antes de activar."}
          </p>
        )}

        <Button
          onClick={toggle}
          disabled={saving || !ready}
          variant={config?.isActive ? "outline" : "default"}
        >
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {config?.isActive ? "Desactivar e-CF" : "Activar e-CF"}
        </Button>
      </div>
    </div>
  );
}

function SecuenciasTab({ sequences }: { sequences: FiscalSequence[] }) {
  if (sequences.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay secuencias configuradas para esta clínica.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-background overflow-hidden max-w-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo NCF</TableHead>
            <TableHead>Prefijo</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Máximo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sequences.map((s) => (
            <TableRow key={s.ncfType}>
              <TableCell className="font-mono font-medium">{s.ncfType}</TableCell>
              <TableCell className="font-mono">{s.prefix}</TableCell>
              <TableCell className="text-right font-mono">{s.current.toLocaleString()}</TableCell>
              <TableCell className="text-right font-mono text-muted-foreground">
                {s.max.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "accepted") return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
  if (status === "rejected" || status === "error") return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === "sent") return <Send className="h-3.5 w-3.5 text-muted-foreground" />;
  return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EnviosTab({ submissions }: { submissions: EcfSubmission[] }) {
  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay envíos registrados todavía.
      </p>
    );
  }

  return (
    <div className="rounded-lg border bg-background overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>eNCF</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Track ID</TableHead>
            <TableHead className="text-right">Intentos</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Error</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-mono text-xs">{s.encf ?? "—"}</TableCell>
              <TableCell>
                <Badge variant={ECF_STATUS_VARIANT[s.status] ?? "secondary"} className="gap-1">
                  <StatusIcon status={s.status} />
                  {ECF_STATUS_LABEL[s.status] ?? s.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {s.trackId ?? "—"}
              </TableCell>
              <TableCell className="text-right text-sm">{s.attempts}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {s.sentAt
                  ? new Date(s.sentAt).toLocaleDateString("es-DO", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                {s.lastError ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
