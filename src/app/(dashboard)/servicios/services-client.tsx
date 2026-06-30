"use client";

import { useEffect, useMemo, useState } from "react";
import { onSnapshot, orderBy, query } from "firebase/firestore";
import { toast } from "sonner";
import { Loader2, Plus, Search } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import {
  createService,
  formatPrice,
  servicesCol,
  updateService,
  type ServiceInput,
} from "@/lib/data/services";
import type { Service } from "@/lib/types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ServicesReader } from "@/components/servicios/Import";

export function ServicesClient() {
  const { tenantId } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    const q = query(servicesCol(tenantId), orderBy("name"));
    return onSnapshot(
      q,
      (snap) => {
        setServices(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Service, "id">) })),
        );
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [tenantId]);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return services;
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(t) ||
        (s.code ?? "").toLowerCase().includes(t),
    );
  }, [services, term]);

  async function toggleActive(s: Service) {
    if (!tenantId) return;
    try {
      await updateService(tenantId, s.id, { active: !s.active });
    } catch {
      toast.error("No se pudo actualizar el servicio");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Catálogo de servicios</h2>
          <p className="text-sm text-muted-foreground">Lista de precios de la clínica.</p>
        </div>        
      </div>
      
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4 space-x-4" /> Nuevo Servicio
        </Button>

      <ServicesReader/>

        

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Buscar por nombre o código…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {term ? "Sin resultados." : "Aún no hay servicios."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((s) => (
                <TableRow key={s.id} className={!s.active ? "opacity-50" : ""}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.code || "—"}</TableCell>
                  <TableCell>{formatPrice(s.price)}</TableCell>
                  <TableCell>{s.taxRate > 0 ? `${s.taxRate}%` : "Exento"}</TableCell>
                  <TableCell>
                    <Badge variant={s.active ? "default" : "secondary"}>
                      {s.active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditing(s);
                        setDialogOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(s)}
                    >
                      {s.active ? "Desactivar" : "Activar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ServiceDialog
        key={editing?.id ?? "new"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenantId={tenantId}
        service={editing}
      />
    </div>
  );
}

const EMPTY: ServiceInput = {
  name: "",
  code: "",
  price: 0,
  taxRate: 18,
};

function ServiceDialog({
  open,
  onOpenChange,
  tenantId,
  service,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tenantId?: string;
  service: Service | null;
}) {
  const isEdit = !!service;
  const [form, setForm] = useState<ServiceInput>(
    service
      ? { name: service.name, code: service.code ?? "", price: service.price, taxRate: service.taxRate }
      : EMPTY,
  );
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setSaving(true);
    try {
      if (isEdit && service) {
        await updateService(tenantId, service.id, form);
        toast.success("Servicio actualizado");
      } else {
        await createService(tenantId, form);
        toast.success("Servicio creado");
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Nombre</Label>
            <Input
              id="svc-name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-code">Código (opcional)</Label>
            <Input
              id="svc-code"
              value={form.code}
              onChange={(e) => set("code", e.target.value)}
              placeholder="LAB-001"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-price">Precio (DOP)</Label>
              <Input
                id="svc-price"
                type="number"
                min="0"
                step="0.01"
                required
                value={form.price}
                onChange={(e) => set("price", parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isEdit ? "Guardar" : "Crear"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
