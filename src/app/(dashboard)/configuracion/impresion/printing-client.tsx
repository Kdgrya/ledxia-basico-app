"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Printer, Power } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  subscribePrinters,
  subscribePrintJobs,
  createPrinter,
  updatePrinter,
  type Printer as PrinterType,
  type PrintJob,
  type PrinterInput,
} from "@/lib/data/printing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const JOB_STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  printing: "Imprimiendo",
  done: "Completado",
  failed: "Error",
};

const JOB_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  printing: "default",
  done: "outline",
  failed: "destructive",
};

const CONNECTION_LABEL: Record<string, string> = {
  network: "Red (TCP/IP)",
  usb: "USB",
  system: "Sistema (CUPS/Windows)",
};

const EMPTY_FORM: PrinterInput & { active: boolean } = {
  name: "",
  connection: "network",
  ipAddress: "",
  port: 9100,
  hasCashDrawer: false,
  active: true,
};

export function PrintingClient() {
  const { tenantId } = useAuth();
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PrinterType | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribePrinters(tenantId, (list) => {
      setPrinters(list);
      setLoadingPrinters(false);
    });
    return unsub;
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribePrintJobs(tenantId, (list) => {
      setJobs(list);
      setLoadingJobs(false);
    });
    return unsub;
  }, [tenantId]);

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  }

  function openEdit(p: PrinterType) {
    setEditing(p);
    setForm({
      name: p.name,
      connection: p.connection,
      ipAddress: p.ipAddress ?? "",
      port: p.port ?? 9100,
      hasCashDrawer: p.hasCashDrawer,
      active: p.active,
    });
    setDialogOpen(true);
  }

  async function toggleActive(p: PrinterType) {
    if (!tenantId) return;
    try {
      await updatePrinter(tenantId, p.id, { active: !p.active });
      toast.success(p.active ? "Impresora desactivada" : "Impresora activada");
    } catch {
      toast.error("No se pudo actualizar la impresora");
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      const input: PrinterInput & { active: boolean } = {
        name: form.name.trim(),
        connection: form.connection,
        hasCashDrawer: form.hasCashDrawer,
        active: form.active,
        ...(form.connection === "network"
          ? { ipAddress: form.ipAddress?.trim() || "", port: form.port ?? 9100 }
          : {}),
      };
      if (editing) {
        await updatePrinter(tenantId, editing.id, input);
        toast.success("Impresora actualizada");
      } else {
        await createPrinter(tenantId, input);
        toast.success("Impresora creada");
      }
      setDialogOpen(false);
    } catch {
      toast.error("No se pudo guardar la impresora");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Impresoras configuradas
          </h2>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva impresora
          </Button>
        </div>

        {loadingPrinters ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : printers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay impresoras configuradas. Agrega una para poder imprimir recibos.
          </div>
        ) : (
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Conexión</TableHead>
                  <TableHead>IP / Puerto</TableHead>
                  <TableHead className="text-center">Cajón</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {printers.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {CONNECTION_LABEL[p.connection] ?? p.connection}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm font-mono">
                      {p.connection === "network"
                        ? `${p.ipAddress ?? "—"}:${p.port ?? 9100}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {p.hasCashDrawer ? "Sí" : "No"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.active ? "default" : "secondary"}>
                        {p.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(p)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleActive(p)}
                          title={p.active ? "Desactivar" : "Activar"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-base">Trabajos recientes</h2>
        {loadingJobs ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No hay trabajos de impresión aún.
          </div>
        ) : (
          <div className="rounded-lg border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Estado</TableHead>
                  <TableHead>Impresora</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => {
                  const printer = printers.find((p) => p.id === j.printerId);
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="text-sm">{j.documentType}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={JOB_STATUS_VARIANT[j.status] ?? "secondary"}>
                          {JOB_STATUS_LABEL[j.status] ?? j.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {printer?.name ?? j.printerId}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {j.createdAt
                          ? new Date(j.createdAt).toLocaleString("es-DO")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-destructive max-w-xs truncate">
                        {j.error ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar impresora" : "Nueva impresora"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="printer-name">Nombre</Label>
              <Input
                id="printer-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Caja principal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="printer-conn">Tipo de conexión</Label>
              <select
                id="printer-conn"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={form.connection}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    connection: e.target.value as "network" | "usb" | "system",
                  }))
                }
              >
                <option value="network">Red (TCP/IP)</option>
                <option value="system">Sistema (CUPS / Windows)</option>
              </select>
            </div>

            {form.connection === "network" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="printer-ip">Dirección IP</Label>
                  <Input
                    id="printer-ip"
                    required={form.connection === "network"}
                    value={form.ipAddress ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, ipAddress: e.target.value }))}
                    placeholder="192.168.1.100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printer-port">Puerto</Label>
                  <Input
                    id="printer-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={form.port ?? 9100}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, port: parseInt(e.target.value) || 9100 }))
                    }
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-3">
              <input
                id="printer-drawer"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.hasCashDrawer}
                onChange={(e) => setForm((f) => ({ ...f, hasCashDrawer: e.target.checked }))}
              />
              <Label htmlFor="printer-drawer" className="font-normal cursor-pointer">
                Tiene cajón de dinero
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <input
                id="printer-active"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              <Label htmlFor="printer-active" className="font-normal cursor-pointer">
                Activo
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editing ? "Guardar cambios" : "Crear impresora"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
